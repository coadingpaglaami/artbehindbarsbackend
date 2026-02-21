import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PrismaModule } from 'src/database/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { ProgressModule } from 'src/progress/progress.module';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
  imports: [PrismaModule, AuthModule,ProgressModule],
})
export class PaymentModule {}
