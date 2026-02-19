import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { PrismaModule } from 'src/database/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { UploadModule } from 'src/upload/upload.module';
import { AccountModule } from 'src/account/account.module';

@Module({
  imports: [PrismaModule, AuthModule, RoleModule, UploadModule,AccountModule],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}
