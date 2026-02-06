import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/role/decorators/role.decorator';
import type { Request } from 'express';
import type {
  ArtistRequestDto,
  ArtistResponseDto,
  ArtworkResponseDto,
  ArtWorkUploadRequestDto,
  ArtWorkUploadResponseDto,
} from './dto/artist.dto';
import { GetArtworksQueryDto } from './dto/artist.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';

@Controller()
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @UseGuards(AuthGuard('jwt'))
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

  @Get('artist')
  async getAllArtists(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ArtistResponseDto>> {
    return this.galleryService.getAllArtists(query);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('artworkupload')
  @Roles(['ADMIN'])
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'artworkImage', maxCount: 1 }]),
  )
  async uploadArtwork(
    @Req() req: Request,
    @Body() artwork: ArtWorkUploadRequestDto,
    @UploadedFiles()
    files: {
      artworkImage: Express.Multer.File[];
    },
  ): Promise<ArtWorkUploadResponseDto> {
    const user = req.user;
    return this.galleryService.uploadArtwork(
      artwork,
      user,
      files.artworkImage[0],
    );
  }

  @Get('artworks')
  async getAllArtworks(
    @Query() query: GetArtworksQueryDto,
  ): Promise<PaginatedResponseDto<ArtworkResponseDto>> {
    console.log('raw query:', query);
    return this.galleryService.getAllArtworks(query);
  }
}
