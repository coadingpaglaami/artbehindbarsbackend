import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class SocketService {
  private server: Server;

  // userId -> Set(socketIds)
  private users = new Map<string, Set<string>>();

  setServer(server: Server) {
    this.server = server;
  }

  // =============================
  // USER SOCKET MANAGEMENT
  // =============================

  registerUser(userId: string, socketId: string) {
    let sockets = this.users.get(userId);

    if (!sockets) {
      sockets = new Set<string>();
      this.users.set(userId, sockets);
    }

    sockets.add(socketId);
  }

  removeSocket(socketId: string) {
    for (const [userId, sockets] of this.users.entries()) {
      if (sockets.has(socketId)) {
        sockets.delete(socketId);

        if (!sockets.size) this.users.delete(userId);
        break;
      }
    }
  }

  emitToUser(userId: string, event: string, payload: any) {
    const sockets = this.users.get(userId);
    if (!sockets) return;

    sockets.forEach((socketId) => {
      this.server.to(socketId).emit(event, payload);
    });
  }

  // =============================
  // AUCTION ROOM MANAGEMENT
  // =============================

  joinAuctionRoom(socketId: string, auctionId: string) {
    this.server.sockets.sockets.get(socketId)?.join(`auction_${auctionId}`);
  }

  leaveAuctionRoom(socketId: string, auctionId: string) {
    this.server.sockets.sockets.get(socketId)?.leave(`auction_${auctionId}`);
  }

  emitToAuction(auctionId: string, event: string, payload: any) {
    this.server.to(`auction_${auctionId}`).emit(event, payload);
  }

  // =============================
  // BROADCAST
  // =============================

  emitAll(event: string, payload: any) {
    this.server.emit(event, payload);
  }
}
