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


@Module({
  imports: [PrismaModule, AuthModule, MailModule, RoleModule, UploadModule, GalleryModule, AuctionModule, PostModule, SocketModule, ConnectionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
