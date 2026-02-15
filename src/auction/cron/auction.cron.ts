import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/database/prisma.service';
import { AuctionService } from '../auction.service';
import { SocketService } from 'src/socket/socket.service';
import { NotificationType } from 'src/database/prisma-client/browser';

@Injectable()
export class AuctionCronService {
  private readonly logger = new Logger(AuctionCronService.name);

  constructor(
    private prisma: PrismaService,
    private auctionService: AuctionService,
    private socketService: SocketService,
  ) {}

  // ===============================
  // 1️⃣ Finalize Auctions Automatically
  // ===============================
  @Cron(CronExpression.EVERY_MINUTE) // every 1 minute, can adjust
  async finalizeEndedAuctions() {
    const now = new Date();

    const auctionsToFinalize = await this.prisma.auction.findMany({
      where: {
        endAt: { lte: now },
        status: { not: 'Ended' },
      },
    });

    if (!auctionsToFinalize.length) return;

    this.logger.log(`Finalizing ${auctionsToFinalize.length} ended auctions`);

    for (const auction of auctionsToFinalize) {
      try {
        await this.auctionService.finalizeAuction(auction.id);

        // Mark auction ended (redundant if already in finalizeAuction, optional)
        await this.prisma.auction.update({
          where: { id: auction.id },
          data: { status: 'Ended' },
        });
      } catch (error) {
        this.logger.error(`Failed to finalize auction ${auction.id}`, error as any);
      }
    }
  }

  // ===============================
  // 2️⃣ Suspend Users With Unpaid Orders
  // ===============================
  @Cron(CronExpression.EVERY_5_MINUTES) // every 5 minutes
  async suspendUnpaidUsers() {
    const overdueOrders = await this.prisma.order.findMany({
      where: {
        status: 'PENDING',
        paymentDueAt: { lt: new Date() },
      },
    });

    if (!overdueOrders.length) return;

    this.logger.log(`Suspending ${overdueOrders.length} overdue users`);

    const suspendUntil = new Date();
    suspendUntil.setMonth(suspendUntil.getMonth() + 2); // 2 months suspension

    for (const order of overdueOrders) {
      try {
        // 1️⃣ Suspend user
        await this.prisma.user.update({
          where: { id: order.buyerId },
          data: { isSuspended: true, suspendedUntil: suspendUntil },
        });

        // 2️⃣ Cancel order
        await this.prisma.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
        });

        // 3️⃣ Notify user
        const notification = await this.prisma.notification.create({
          data: {
            userId: order.buyerId,
            title: 'Account Suspended',
            message: 'Auction payment missed. Account suspended for 2 months.',
            type: NotificationType.ADMIN,
          },
        });

        // 4️⃣ Emit via socket
        this.socketService.emitToUser(order.buyerId, 'notification', notification);
      } catch (error) {
        this.logger.error(`Failed to suspend user ${order.buyerId}`, error as any);
      }
    }
  }
}
