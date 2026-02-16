import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/database/prisma.module';
import { UploadModule } from 'src/upload/upload.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports:[AuthModule,PrismaModule,UploadModule,MailModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
