import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SquareClient, SquareEnvironment, SquareError } from 'square'; // New names
import { v4 as uuidv4 } from 'uuid';
import { IPaymentData } from './dto/pay.dto';
import { PrismaService } from 'src/database/prisma.service';
import { ProgressService } from 'src/progress/progress.service';
import { ActivityType } from 'src/database/prisma-client/enums';
import { SocketService } from 'src/socket/socket.service';

@Injectable()
export class PaymentService {
  private client: SquareClient;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly progressService: ProgressService,
    private readonly socket: SocketService,
  ) {
    this.client = new SquareClient({
      token: process.env.SANDBOX_ACCESS_TOKEN,
      environment: SquareEnvironment.Sandbox,
    });
  }
  async createPayment(paymentData: IPaymentData, userId: string) {
    const { sourceId, amount, shippingInfo, artworkId, orderId } = paymentData;

    try {
      // ✅ 1. Convert Dollars → Cents correctly
      const amountInCents = BigInt(Math.round(amount * 100));

      // ✅ 2. Create Square Payment FIRST
      const { payment } = await this.client.payments.create({
        idempotencyKey: uuidv4(),
        sourceId,
        amountMoney: {
          amount: amountInCents,
          currency: 'USD',
        },
      });

      if (!payment?.id) {
        throw new Error('Square payment failed');
      }

      // ✅ 3. DB TRANSACTION
      const result = await this.prismaService.$transaction(async (tx) => {
        let order;

        // ============================
        // 🔥 AUCTION FLOW
        // ============================
        if (orderId) {
          const existingOrder = await tx.order.findFirst({
            where: {
              id: orderId,
              buyerId: userId,
              status: 'PENDING',
            },
          });

          if (!existingOrder) {
            throw new NotFoundException('Pending order not found');
          }

          order = await tx.order.update({
            where: { id: existingOrder.id },
            data: {
              squarePaymentId: String(payment.id),
              status: 'COMPLETED',
              totalAmount: amount,

              shippingFullName: shippingInfo.fullName,
              shippingAddress: shippingInfo.streetAddress,
              shippingCity: shippingInfo.city,
              shippingState: shippingInfo.state,
              shippingZip: shippingInfo.zipCode,
              shippingPhone: shippingInfo.phoneNumber,
            },
            include: {
              buyer: {
                select: { id: true, email: true, firstName: true },
              },
              artwork: {
                select: { id: true, title: true, imageUrl: true },
              },
            },
          });

          // mark artwork sold
          await tx.artwork.update({
            where: { id: existingOrder.artworkId as string },
            data: { isSold: true },
          });
        }

        // ============================
        // 🔥 BUY NOW FLOW
        // ============================
        else if (artworkId) {
          // Check if artwork already sold
          const artwork = await tx.artwork.findUnique({
            where: { id: artworkId },
          });

          if (!artwork || artwork.isSold) {
            throw new BadRequestException('Artwork already sold');
          }

          // Mark artwork sold
          await tx.artwork.update({
            where: { id: artworkId },
            data: { isSold: true },
          });

          // Create new order
          order = await tx.order.create({
            data: {
              artworkId,
              buyerId: userId,
              squarePaymentId: String(payment.id),
              status: 'COMPLETED',
              totalAmount: amount,

              shippingFullName: shippingInfo.fullName,
              shippingAddress: shippingInfo.streetAddress,
              shippingCity: shippingInfo.city,
              shippingState: shippingInfo.state,
              shippingZip: shippingInfo.zipCode,
              shippingPhone: shippingInfo.phoneNumber,
            },
            include: {
              buyer: {
                select: { id: true, email: true, firstName: true },
              },
              artwork: {
                select: { id: true, title: true, imageUrl: true },
              },
            },
          });
        } else {
          throw new BadRequestException(
            'Either orderId (auction) or artworkId (buy now) is required',
          );
        }
        // Award progress points
        const auction = await tx.auction.findFirst({
          where: { artworkId: order.artworkId },
        });

        if (auction?.status === 'Upcoming' || auction?.status === 'Ongoing') {
          await tx.auction.update({
            where: { id: auction.id },
            data: {
              status: 'Ended',
            },
          });
          const bidders = await tx.auctionBid.findMany({
            where: {
              auctionId: auction.id,
            },
            select: { userId: true },
          });

          if (bidders.length === 0) {
            return order;
          }

          // 2️⃣ Remove duplicates (very important)
          const uniqueBidderIds = [...new Set(bidders.map((b) => b.userId))];

          // 3️⃣ Create notifications for all bidders
          await tx.notification.createMany({
            data: uniqueBidderIds.map((userId) => ({
              userId,
              title: 'Auction Ended',
              message: `Auction for "${order.artwork.title}" has been sold for $${order.totalAmount}.`,
            })),
          });

          uniqueBidderIds.forEach((bidderId) => {
            this.socket.emitToUser(bidderId, 'notification', {
              title: 'Auction Ended',
              message: `Auction for "${order.artwork.title}" has been sold for $${order.totalAmount}.`,
            });
          });
        }

        const admin = await tx.user.findFirst({
          where: { role: 'ADMIN' },
        });

        if (admin) {
          await tx.notification.create({
            data: {
              userId: admin?.id ?? '',
              title: 'New Sale',
              message: `Artwork "${order.artwork.title}" sold for $${order.totalAmount} to ${order.buyer.firstName}.`,
            },
          });
        }

        this.socket.emitToUser(admin?.id ?? '', 'notification', {
          title: 'New Sale',
          message: `Artwork "${order.artwork.title}" sold for $${order.totalAmount} to ${order.buyer.firstName}.`,
        });

        await this.progressService.award(
          userId,
          ActivityType.BUY_PRODUCT,
          order.id,
        );

        return order;
      });

      return await this.serializeBigInt(result);
    } catch (error) {
      console.error('--- PAYMENT ERROR LOG ---');
      console.error(error);

      if (error instanceof SquareError) {
        console.error('Square Specific Errors:', error.errors);
        throw new InternalServerErrorException(
          error.errors?.[0]?.detail || 'Square payment failed',
        );
      }

      throw new InternalServerErrorException(
        error.message || 'Payment processing failed',
      );
    }
  }

  async getMonthlyStats(start: string, end: string) {
    try {
      const { data } = await this.client.payments.list({
        beginTime: start,
        endTime: end,
      });
      return await this.serializeBigInt(data || []);
    } catch (error) {
      if (error instanceof SquareError) {
        console.error(error.errors);
      }
      throw new InternalServerErrorException('Square API Error');
    }
  }

  private async serializeBigInt(obj: any) {
    return JSON.parse(
      JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  async getOrderById(id: string) {
    const order = await this.prismaService.order.findUnique({
      where: { id },
    });
    return this.serializeBigInt(order);
  }

  async getSquarePaymentById(paymentId: string) {
    try {
      const response = await this.client.payments.get({
        paymentId: paymentId,
      });

      if (!response?.payment) {
        throw new NotFoundException('Square payment not found');
      }

      return this.serializeBigInt({
        id: response.payment.id,
        status: response.payment.status,
        card: response.payment.cardDetails?.card,
      });
    } catch (error) {
      console.error('Square fetch error:', error);

      if (error instanceof SquareError) {
        throw new InternalServerErrorException(
          error.errors?.[0]?.detail || 'Square API error',
        );
      }

      throw new InternalServerErrorException('Failed to fetch payment');
    }
  }
}
