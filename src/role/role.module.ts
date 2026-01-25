import { Module } from '@nestjs/common';
import { RolesGuard } from './guard/role.guard';
import { PrismaModule } from 'src/database/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RolesGuard],
  exports: [RolesGuard],
})
export class RoleModule {}
