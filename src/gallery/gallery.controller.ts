import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/role/decorators/role.decorator';
import type { Request } from 'express';
import type { ArtistRequestDto, ArtistResponseDto } from './dto/artist.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@UseGuards(AuthGuard('jwt'))
@Controller()
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Post('artist')
  @Roles(['ADMIN'])
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'artistImage', maxCount: 1 }]),
  )
  async createArtist(
    @Req() req: Request,
    @Body() artist: ArtistRequestDto,
    @UploadedFiles()
    files: {
      artistImage: Express.Multer.File[];
    },
  ): Promise<ArtistResponseDto> {
    const user = req.user;
    return this.galleryService.createArtist(artist, user, files.artistImage[0]);
  }
}
