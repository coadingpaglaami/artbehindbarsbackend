import { Module } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { GalleryController } from './gallery.controller';
import { PrismaModule } from 'src/database/prisma.module';
import { RoleModule } from 'src/role/role.module';
import { UploadModule } from 'src/upload/upload.module';
import { AuthModule } from 'src/auth/auth.module';
import { ProgressModule } from 'src/progress/progress.module';

@Module({
  imports:[RoleModule,PrismaModule,UploadModule,AuthModule,ProgressModule],
  controllers: [GalleryController],
  providers: [GalleryService],
})
export class GalleryModule {}
