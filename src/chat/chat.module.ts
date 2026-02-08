import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/database/prisma.module';
import { SocketModule } from 'src/socket/socket.module';

@Module({
  imports:[AuthModule,PrismaModule,SocketModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
