import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class NotificationService {
      constructor(private prisma: PrismaService) {}

  create(userId: string, title: string, message: string) {
    return this.prisma.notification.create({
      data: { userId, title, message },
    });
  }

  getMyNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
}
