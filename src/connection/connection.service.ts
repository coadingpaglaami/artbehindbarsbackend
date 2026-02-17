import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';
import { ConnectionStatus, NotificationType } from 'src/database/prisma-client/enums';
import { PrismaService } from 'src/database/prisma.service';
import { SocketService } from 'src/socket/socket.service';

@Injectable()
export class ConnectionService {
  constructor(
    private prisma: PrismaService,
    private socketService: SocketService,
  ) {}

  // SEND REQUEST
  async sendRequest(req: any, receiverId: string) {
    const userId = this.getUserId(req);
    if (userId === receiverId)
      throw new BadRequestException('Cannot connect with yourself');

    const existing = await this.prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: userId, receiverId },
          { requesterId: receiverId, receiverId: userId },
        ],
      },
    });

    if (existing) throw new BadRequestException('Connection already exists');

    const connection = await this.prisma.connection.create({
      data: {
        requesterId: userId,
        receiverId,
      },
    });

    const receiver = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    
    // 🔔 SOCKET EVENT HERE (receiverId)
    // this.socketGateway.notify(receiverId)
    this.socketService.emitToUser(receiverId, 'connection-request', {
      connectionId: connection.id,
      receiverId: receiverId,
      fromUserId: userId,
      payload: `You have a new connection request from ${receiver?.firstName} ${receiver?.lastName}`,
    });
    this.prisma.notification.create({
      data: {
        userId: receiverId,
        type: NotificationType.CONNECTION_REQUEST,
        title: 'New Connection Request',
        message: `You have a new connection request from ${req.user.firstName} ${req.user.lastName}`,

      },
    });

    return {
      message: 'Connection request sent',
      connection,
    };
  }

  // ACCEPT
  async acceptRequest(req: any, connectionId: string) {
    const userId = this.getUserId(req);
    const connection = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) throw new NotFoundException();

    if (connection.receiverId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.connection.update({
      where: { id: connectionId },
      data: { status: ConnectionStatus.ACCEPTED },
    });

    this.socketService.emitToUser(
      connection.requesterId,
      'connection-accepted',
      {
        connectionId,
        byUserId: userId,
        payload: `Your connection request has been accepted by ${req.user.firstName} ${req.user.lastName}`,
      },
    );
    this.prisma.notification.create({
      data: {
        userId: connection.requesterId,
        type: NotificationType.CONNECTION_ACCEPTED,
        title: 'Connection Request Accepted',
        message: `Your connection request has been accepted by ${req.user.firstName} ${req.user.lastName}`,
      },
    });

    return {
      message: 'Connection accepted',
      connection: updated,
    };
  }

  // REJECT
  async rejectRequest(req: any, connectionId: string) {
    const userId = this.getUserId(req);
    const connection = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (connection?.status === ConnectionStatus.ACCEPTED) {
      throw new BadRequestException('Cannot reject an accepted connection');
    }

    if (!connection) throw new NotFoundException();

    if (connection.receiverId !== userId) throw new ForbiddenException();

    await this.prisma.connection.update({
      where: { id: connectionId },
      data: { status: ConnectionStatus.REJECTED },
    });
    this.socketService.emitToUser(
      connection.requesterId,
      'connection-rejected',
      {
        connectionId,
        byUserId: userId,
      },
    );

    return { message: 'Connection rejected' };
  }

  // DISCONNECT
  async disconnect(req: any, connectionId: string) {
    const userId = this.getUserId(req);
    const connection = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) throw new NotFoundException();

    if (connection.requesterId !== userId && connection.receiverId !== userId)
      throw new ForbiddenException();

    await this.prisma.connection.delete({
      where: { id: connectionId },
    });

    const otherUserId =
      connection.requesterId === userId
        ? connection.receiverId
        : connection.requesterId;

    this.socketService.emitToUser(otherUserId, 'connection-disconnected', {
      connectionId,
    });

    return { message: 'Disconnected successfully' };
  }

  // INCOMING REQUESTS
  async getIncomingRequests(req: any, dto: PaginationQueryDto) {
    const userId = this.getUserId(req);
    const { page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.connection.count({
        where: { receiverId: userId, status: 'PENDING' },
      }),
      this.prisma.connection.findMany({
        where: { receiverId: userId, status: 'PENDING' },
        include: {
          requester: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        skip,
        take: limit,
      }),
    ]);

    return this.paginate(data, total, page, limit);
  }

  // MY REQUESTS
  async getMyRequests(req: any, dto: PaginationQueryDto) {
    const userId = this.getUserId(req);
    const { page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;

    const [total, connections] = await Promise.all([
      this.prisma.connection.count({
        where: { requesterId: userId, status: 'PENDING' },
      }),
      this.prisma.connection.findMany({
        where: { requesterId: userId, status: 'PENDING' },
        include: {
          receiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePictureUrl: true,
            },
          },
        },
        skip,
        take: limit,
      }),
    ]);

    const data = connections.map((conn) => conn.receiver);

    return this.paginate(data, total, page, limit);
  }

  // MY CONNECTIONS
  async getMyConnections(req: any, dto: PaginationQueryDto) {
    const userId = this.getUserId(req);
    const { page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;

    const where = {
      status: ConnectionStatus.ACCEPTED,
      OR: [{ requesterId: userId }, { receiverId: userId }],
    };

    // 1️⃣ Get connections with users + their connection counts
    const [total, connections] = await Promise.all([
      this.prisma.connection.count({ where }),
      this.prisma.connection.findMany({
        where,
        skip,
        take: limit,
        include: {
          requester: {
            include: {
              _count: {
                select: {
                  receivedConnections: {
                    where: { status: ConnectionStatus.ACCEPTED },
                  },
                  sentConnections: {
                    where: { status: ConnectionStatus.ACCEPTED },
                  },
                },
              },
            },
          },
          receiver: {
            include: {
              _count: {
                select: {
                  receivedConnections: {
                    where: { status: ConnectionStatus.ACCEPTED },
                  },
                  sentConnections: {
                    where: { status: ConnectionStatus.ACCEPTED },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    // 2️⃣ Extract other user IDs
    const otherUserIds = connections.map((conn) =>
      conn.requesterId === userId ? conn.receiverId : conn.requesterId,
    );

    // 3️⃣ Fetch chats that contain me AND any of those users
    const chats = await this.prisma.chat.findMany({
      where: {
        AND: [
          { participants: { some: { userId } } },
          {
            participants: {
              some: {
                userId: { in: otherUserIds },
              },
            },
          },
        ],
      },
      include: {
        participants: true,
      },
    });

    // 4️⃣ Build chat map: otherUserId -> chatId
    const chatMap = new Map<string, string>();

    chats.forEach((chat) => {
      if (chat.participants.length === 2) {
        const otherParticipant = chat.participants.find(
          (p) => p.userId !== userId,
        );
        if (otherParticipant) {
          chatMap.set(otherParticipant.userId, chat.id);
        }
      }
    });

    // 5️⃣ Format final response
    const formatted = connections.map((conn) => {
      const otherUser =
        conn.requesterId === userId ? conn.receiver : conn.requester;

      const connectionsCount =
        otherUser._count.receivedConnections + otherUser._count.sentConnections;

      return {
        connectionId: conn.id,
        chatId: chatMap.get(otherUser.id) ?? null,
        user: {
          id: otherUser.id,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          email: otherUser.email,
          profilePictureUrl: otherUser.profilePictureUrl,
          connectionsCount,
        },
      };
    });

    return {
      data: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private paginate<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponseDto<T> {
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getConnectionStatus(req:any, otherId: string) {
    const myId = this.getUserId(req);
    const connection = await this.prisma.connection.findFirst({
      where: {
        OR: [
          {
            requesterId: myId,
            receiverId: otherId,
          },
          {
            requesterId: otherId,
            receiverId: myId,
          },
        ],
      },
    });

    if (!connection) {
      return {
        status: 'NONE',
        direction: null,
      };
    }

    return {
      connectionId: connection.id,
      status: connection.status,
      direction: connection.requesterId === myId ? 'OUTGOING' : 'INCOMING',
    };
  }
  private getUserId(req: any): string {
    return req.user?.sub;
  }
}
