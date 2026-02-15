import { Module } from '@nestjs/common';
import { AuctionService } from './auction.service';
import { AuctionController } from './auction.controller';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/database/prisma.module';
import { RoleModule } from 'src/role/role.module';
import { SocketModule } from 'src/socket/socket.module';
import { NotificationModule } from 'src/notification/notification.module';
import { AuctionCronService } from './cron/auction.cron';

@Module({
  imports: [
    RoleModule,
    PrismaModule,
    AuthModule,
    SocketModule,
    NotificationModule,
  ],
  controllers: [AuctionController],
  providers: [AuctionService, AuctionCronService],
})
export class AuctionModule {}
