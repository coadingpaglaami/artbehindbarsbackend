import { Module } from '@nestjs/common';
import { OverviewService } from './overview.service';
import { OverviewController } from './overview.controller';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/database/prisma.module';
import { RoleModule } from 'src/role/role.module';

@Module({
  imports:[AuthModule,PrismaModule,RoleModule],
  controllers: [OverviewController],
  providers: [OverviewService],
})
export class OverviewModule {}
