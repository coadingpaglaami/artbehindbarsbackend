import { Module } from '@nestjs/common';
import { AuctionService } from './auction.service';
import { AuctionController } from './auction.controller';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/database/prisma.module';
import { RoleModule } from 'src/role/role.module';
import { SocketModule } from 'src/socket/socket.module';

@Module({
  imports: [RoleModule, PrismaModule, AuthModule,SocketModule],
  controllers: [AuctionController],
  providers: [AuctionService],
})
export class AuctionModule {}
