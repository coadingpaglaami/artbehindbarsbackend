import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import {
  CreateFanMailDto,
  FanMailQueryDto,
  ReplyFanMailDto,
} from './dto/fanmail.dto';

const ADMIN_FANMAIL_BASE_ROUTE = 'admin/fanmail';

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
    console.log(artist);
    return this.galleryService.createArtist(artist, user, files.artistImage[0]);
  }

  @Get('artist')
  async getAllArtists(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ArtistResponseDto>> {
    return this.galleryService.getAllArtists(query);
  }

  @Get('artist/:id')
  async getArtistById(@Param('id') id: string): Promise<ArtistResponseDto> {
    return this.galleryService.getArtistById(id);
  }

  @Patch('artist/:id')
  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'artistImage', maxCount: 1 }]),
  )
  async updateArtist(
    @Param('id') id: string,
    @Body() artist: Partial<ArtistRequestDto>,
    @UploadedFiles()
    files: {
      artistImage?: Express.Multer.File[];
    },
  ): Promise<ArtistResponseDto> {
    // Update functionality will be implemented later
    return this.galleryService.updateArtist(
      id,
      artist,
      files.artistImage ? files.artistImage[0] : undefined,
    );
  }
  @Delete('artist/:id')
  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  async deleteArtist(@Param('id') id: string): Promise<{ message: string }> {
    return this.galleryService.deleteArtist(id);
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

  @Get('artwork/:id')
  async getArtworkById(@Param('id') id: string): Promise<ArtworkResponseDto> {
    return this.galleryService.getArtworkById(id);
  }

  @Patch('artwork/:id')
  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'artworkImage', maxCount: 1 }]),
  )
  async updateArtwork(
    @Param('id') id: string,
    @Body() artwork: Partial<ArtWorkUploadRequestDto>,
    @UploadedFiles()
    files: {
      artworkImage?: Express.Multer.File[];
    },
  ): Promise<ArtworkResponseDto> {
    return this.galleryService.updateArtwork(
      id,
      artwork,
      files.artworkImage ? files.artworkImage[0] : undefined,
    );
  }

  @Delete('artwork/:id')
  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  async deleteArtwork(@Param('id') id: string): Promise<{ message: string }> {
    return this.galleryService.deleteArtwork(id);
  }

  @Post(':artistId/send')
  @UseGuards(AuthGuard('jwt'))
  send(
    @Req() req: any,
    @Param('artistId') artistId: string,
    @Body() dto: CreateFanMailDto,
  ) {
    return this.galleryService.sendFanMail(req.user.sub, artistId, dto);
  }

  @Get('fan_mail/my')
  @UseGuards(AuthGuard('jwt'))
  myMails(@Req() req: any, @Query() query: PaginationQueryDto) {
    return this.galleryService.getMyFanMails(req.user.sub, query);
  }

  @Get(ADMIN_FANMAIL_BASE_ROUTE)
  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  getAll(@Query() query: FanMailQueryDto) {
    return this.galleryService.adminGetFanMails(query);
  }

  // 📄 View single fan mail + replies
  @Get(`${ADMIN_FANMAIL_BASE_ROUTE}/:id`)
  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  getOne(@Param('id') id: string) {
    return this.galleryService.adminGetFanMail(id);
  }

  // ✉️ Reply as artist
  @Post(`${ADMIN_FANMAIL_BASE_ROUTE}/:id/reply`)
  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  reply(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReplyFanMailDto,
  ) {
    return this.galleryService.adminReply(req.user.sub, id, dto);
  }

  // 🗄️ Archive fan mail
  @Patch(`${ADMIN_FANMAIL_BASE_ROUTE}/:id/archive`)
  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  archive(@Param('id') id: string) {
    return this.galleryService.archiveFanMail(id);
  }
}
