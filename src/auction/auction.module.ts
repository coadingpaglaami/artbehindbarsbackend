import { Module } from '@nestjs/common';
import { AuctionService } from './auction.service';
import { AuctionController } from './auction.controller';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/database/prisma.module';
import { RoleModule } from 'src/role/role.module';

@Module({
  imports: [RoleModule, PrismaModule, AuthModule],
  controllers: [AuctionController],
  providers: [AuctionService],
})
export class AuctionModule {}
