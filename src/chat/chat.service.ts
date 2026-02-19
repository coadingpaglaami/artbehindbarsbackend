import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SocketService } from '../socket/socket.service';
import { PrismaService } from 'src/database/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';

import { PaginatedPostResponse } from 'src/post/dto/post.dto';
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private socketService: SocketService,
  ) {}

  // Create or get existing 1-to-1 chat
  async getOrCreateChat(userId: string, otherUserId: string) {
    if (userId === otherUserId)
      throw new ForbiddenException('Cannot chat with yourself');

    const existingChat = await this.prisma.chat.findFirst({
      where: {
        participants: {
          every: {
            userId: { in: [userId, otherUserId] },
          },
        },
      },
      include: { participants: true },
    });

    if (existingChat) return existingChat;

    return this.prisma.chat.create({
      data: {
        participants: {
          createMany: {
            data: [{ userId }, { userId: otherUserId }],
          },
        },
      },
      include: { participants: true },
    });
  }

  // Send message
  async sendMessage(senderId: string, chatId: string, content: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: true },
    });

    if (!chat) throw new NotFoundException('Chat not found');

    const isParticipant = chat.participants.some((p) => p.userId === senderId);
    if (!isParticipant)
      throw new ForbiddenException('You are not part of this chat');

    const message = await this.prisma.message.create({
      data: {
        chatId,
        senderId,
        content,
        statuses: {
          createMany: {
            data: chat.participants
              .filter((p) => p.userId !== senderId)
              .map((p) => ({
                userId: p.userId,
                seen: false,
              })),
          },
        },
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true },
        },
        statuses: true,
      },
    });

    // Emit real-time to other user
    const recipient = chat.participants.find((p) => p.userId !== senderId);
    if (recipient) {
      this.socketService.emitToUser(recipient.userId, 'new_message', message);
    }

    return message;
  }

  // Get messages in a chat
  async getMessages(userId: string, chatId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: true },
    });

    if (!chat) throw new NotFoundException('Chat not found');

    const isParticipant = chat.participants.some((p) => p.userId === userId);
    if (!isParticipant)
      throw new ForbiddenException('You are not part of this chat');

    return this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true },
        },
        statuses: true,
      },
    });
  }

  // Mark messages as seen
  async markAsSeen(userId: string, chatId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        chatId,
        statuses: {
          some: {
            userId,
            seen: false,
          },
        },
      },
      select: { id: true },
    });

    const messageIds = messages.map((m) => m.id);
    if (!messageIds.length) return { updated: 0 };

    const result = await this.prisma.messageStatus.updateMany({
      where: {
        messageId: { in: messageIds },
        userId,
      },
      data: {
        seen: true,
        seenAt: new Date(),
      },
    });

    // Notify sender(s)
    for (const messageId of messageIds) {
      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
        select: { senderId: true, chatId: true },
      });

      if (message) {
        this.socketService.emitToUser(message.senderId, 'message_seen', {
          messageId,
          seenAt: new Date(),
        });
      }
    }

    return result;
  }

  // Get all chats of a user (with last message + unread count)
  async getUserChats(
    userId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<any>> {
    const { page = 1, limit = 10 } = pagination;

    const skip = (page - 1) * limit;

    // 1️⃣ Get total count (for meta)
    const total = await this.prisma.chat.count({
      where: {
        participants: {
          some: { userId },
        },
      },
    });

    // 2️⃣ Get paginated chats
    const chats = await this.prisma.chat.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    });

    // 3️⃣ Add unread count per chat
    const enrichedChats = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await this.prisma.messageStatus.count({
          where: {
            userId,
            seen: false,
            message: {
              chatId: chat.id,
            },
          },
        });

        // ✅ find the other participant
        const otherParticipant = chat.participants.find(
          (p) => p.user.id !== userId,
        );

        const otherUser = otherParticipant?.user || null;

        return {
          ...chat,
          otherUser, // 👈 ADD HERE
          unreadCount,
        };
      }),
    );

    return {
      data: enrichedChats,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
