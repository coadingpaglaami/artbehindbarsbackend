import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/database/prisma.module';
import { UploadModule } from 'src/upload/upload.module';
import { MailModule } from 'src/mail/mail.module';
import { PaymentModule } from 'src/payment/payment.module';

@Module({
  imports:[AuthModule,PrismaModule,UploadModule,MailModule,PaymentModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
