import { Module } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { GalleryController } from './gallery.controller';
import { PrismaModule } from 'src/database/prisma.module';
import { RoleModule } from 'src/role/role.module';
import { UploadModule } from 'src/upload/upload.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports:[RoleModule,PrismaModule,UploadModule,AuthModule],
  controllers: [GalleryController],
  providers: [GalleryService],
})
export class GalleryModule {}
