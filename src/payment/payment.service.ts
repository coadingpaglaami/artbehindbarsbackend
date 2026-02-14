import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SquareClient, SquareEnvironment, SquareError } from 'square'; // New names
import { v4 as uuidv4 } from 'uuid';
import { IPaymentData } from './dto/pay.dto';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class PaymentService {
  private client: SquareClient;

  constructor(private readonly prismaService: PrismaService) {
    this.client = new SquareClient({
      token: process.env.SANDBOX_ACCESS_TOKEN,
      environment: SquareEnvironment.Sandbox,
    });
  }

  async createPayment(paymentData: IPaymentData, userId: string) {
    const { sourceId, amount, shippingInfo, artworkId } = paymentData;

    try {
      // 1. Correct Amount Calculation (Dollars to Cents)
      // If amount is 15.15, amountInCents must be 1515
      const amountInCents = BigInt(Math.round(amount));

      // 2. Process Square Payment
      const { payment } = await this.client.payments.create({
        idempotencyKey: uuidv4(),
        sourceId,
        amountMoney: {
          amount: amountInCents,
          currency: 'USD',
        },
      });

      // 3. Database Transaction
      const result = await this.prismaService.$transaction(async (tx) => {
        // 1. Mark artwork sold
        await tx.artwork.update({
          where: { id: artworkId },
          data: { isSold: true },
        });

        // 2. Create order WITH squarePaymentId + status
        return await tx.order.create({
          data: {
            artworkId,
            buyerId: userId,
            squarePaymentId: String(payment?.id),
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
      });

      // Return the serialized result (The DB Order)
      return this.serializeBigInt(result);
    } catch (error) {
      // IMPORTANT: Log the actual error to your terminal so you can see it!
      console.error('--- PAYMENT ERROR LOG ---');
      console.error(error);

      if (error instanceof SquareError) {
        console.error('Square Specific Errors:', error.errors);
        throw new InternalServerErrorException(error.errors[0].detail);
      }

      // If it's a Prisma error, the 'console.error(error)' above will now show it
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
      return this.serializeBigInt(data || []);
    } catch (error) {
      if (error instanceof SquareError) {
        console.error(error.errors);
      }
      throw new InternalServerErrorException('Square API Error');
    }
  }

  private serializeBigInt(obj: any) {
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
}
