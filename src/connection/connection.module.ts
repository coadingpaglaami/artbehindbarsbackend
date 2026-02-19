import { Module } from '@nestjs/common';
import { ConnectionService } from './connection.service';
import { ConnectionController } from './connection.controller';
import { PrismaModule } from 'src/database/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { SocketModule } from 'src/socket/socket.module';
import { NotificationModule } from 'src/notification/notification.module';
import { AccountModule } from 'src/account/account.module';

@Module({
  imports:[PrismaModule,AuthModule,SocketModule,NotificationModule,AccountModule],
  controllers: [ConnectionController],
  providers: [ConnectionService],
})
export class ConnectionModule {}
