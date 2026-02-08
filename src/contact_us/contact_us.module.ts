import { Module } from '@nestjs/common';
import { ContactUsService } from './contact_us.service';
import { ContactUsController } from './contact_us.controller';
import { RoleModule } from 'src/role/role.module';
import { AuthModule } from 'src/auth/auth.module';
import { MailModule } from 'src/mail/mail.module';
import { PrismaModule } from 'src/database/prisma.module';

@Module({
  imports: [RoleModule, AuthModule, MailModule,PrismaModule],
  controllers: [ContactUsController],
  providers: [ContactUsService],
})
export class ContactUsModule {}
