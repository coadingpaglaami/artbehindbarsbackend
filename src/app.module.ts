import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { RoleModule } from './role/role.module';
import { UploadModule } from './upload/upload.module';
import { GalleryModule } from './gallery/gallery.module';
import { AuctionModule } from './auction/auction.module';
import { PostModule } from './post/post.module';
import { SocketModule } from './socket/socket.module';
import { ConnectionModule } from './connection/connection.module';
import { ContactUsModule } from './contact_us/contact_us.module';
import { ChatModule } from './chat/chat.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationModule } from './notification/notification.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AccountModule } from './account/account.module';
import { ProgressModule } from './progress/progress.module';
import { OverviewModule } from './overview/overview.module';
import { SuspendedGuard } from './role/guard/suspend.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MailModule,
    RoleModule,
    UploadModule,
    GalleryModule,
    AuctionModule,
    PostModule,
    SocketModule,
    ConnectionModule,
    ContactUsModule,
    ChatModule,
    PaymentModule,
    NotificationModule,
    ScheduleModule.forRoot(),
    AccountModule,
    ProgressModule,
    OverviewModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: SuspendedGuard,
    },
  ],
})
export class AppModule {}
