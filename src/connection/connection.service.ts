import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';
import { ConnectionStatus } from 'src/database/prisma-client/enums';
import { PrismaService } from 'src/database/prisma.service';
import { SocketService } from 'src/socket/socket.service';

@Injectable()
export class ConnectionService {
  constructor(
    private prisma: PrismaService,
    private socketService: SocketService,
  ) {}

  // SEND REQUEST
  async sendRequest(userId: string, receiverId: string) {
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
    // 🔔 SOCKET EVENT HERE (receiverId)
    // this.socketGateway.notify(receiverId)
    this.socketService.emitToUser(receiverId, 'connection-request', {
      connectionId: connection.id,
      fromUserId: userId,
    });

    return {
      message: 'Connection request sent',
      connection,
    };
  }

  // ACCEPT
  async acceptRequest(userId: string, connectionId: string) {
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
      },
    );

    return {
      message: 'Connection accepted',
      connection: updated,
    };
  }

  // REJECT
  async rejectRequest(userId: string, connectionId: string) {
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
  async disconnect(userId: string, connectionId: string) {
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
  async getIncomingRequests(userId: string, dto: PaginationQueryDto) {
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

  // MY CONNECTIONS
  async getMyConnections(userId: string, dto: PaginationQueryDto) {
    const { page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;

    const where = {
      status: ConnectionStatus.ACCEPTED,
      OR: [{ requesterId: userId }, { receiverId: userId }],
    };

    const [total, data] = await Promise.all([
      this.prisma.connection.count({ where }),
      this.prisma.connection.findMany({
        where,
        include: {
          requester: true,
          receiver: true,
        },
        skip,
        take: limit,
      }),
    ]);

    return this.paginate(data, total, page, limit);
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

  async getConnectionStatus(myId: string, otherId: string) {
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
      status: connection.status,
      direction: connection.requesterId === myId ? 'OUTGOING' : 'INCOMING',
    };
  }
}
