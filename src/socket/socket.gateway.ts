import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { SocketService } from './socket.service';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  server: Server;
  constructor(
    private readonly socketService: SocketService,
    private jwtService: JwtService,
  ) {}
  afterInit(server: Server) {
    this.server = server;
    this.socketService.setServer(server);
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) return client.disconnect();

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      await this.socketService.registerUser(payload.sub, client.id);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    await this.socketService.removeSocket(client.id);
  }

  @SubscribeMessage('joinAuction')
  handleJoinAuction(
    @ConnectedSocket() client: Socket,
    @MessageBody() auctionId: string,
  ) {
    this.socketService.joinAuctionRoom(client.id, auctionId);
  }

  // 🔥 LEAVE AUCTION ROOM
  @SubscribeMessage('leaveAuction')
  handleLeaveAuction(
    @ConnectedSocket() client: Socket,
    @MessageBody() auctionId: string,
  ) {
    this.socketService.leaveAuctionRoom(client.id, auctionId);
  }
}
