import { Injectable, Req } from '@nestjs/common';
import { NotificationType } from 'src/database/prisma-client/enums';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'INFO',
  ) {
    return await this.prisma.notification.create({
      data: { userId, title, message, type },
    });
  }

  async getMyNotifications(userId: string) {
    const result = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    console.log('Notifications fetched for user:', userId, result);
    return result;
  }

  async markAsRead(notificationId: string) {
    return await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  // Mark all notifications for a user as read
  async markAllAsRead(userId: string) {
    return await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  // Delete a notification
  async delete(notificationId: string) {
    return await this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }
}
