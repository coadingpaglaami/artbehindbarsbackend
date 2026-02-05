import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ArtistRequestDto,
  ArtistResponseDto,
  ArtWorkUploadRequestDto,
  ArtWorkUploadResponseDto,
} from './dto/artist.dto';
import { PrismaService } from 'src/database/prisma.service';
import { UploadService } from 'src/upload/upload.service';

@Injectable()
export class GalleryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}
  async createArtist(
    artist: ArtistRequestDto,
    user: any,
    file: Express.Multer.File,
  ): Promise<ArtistResponseDto> {
    const id = user.sub;
    const role = user.role;

    if (role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }
    const admin = await this.prisma.user.findUnique({ where: { id } });
    if (!admin) {
      throw new Error('User not found');
    }
    const {
      facilityName,
      inmateId,
      lifeSentence,
      maxReleaseDate,
      minReleaseDate,
      name,
      state,
    } = artist;
    const image = await this.uploadService.uploadSingleFile(file);
    const newartist = await this.prisma.artist.create({
      data: {
        name,
        facilityName,
        lifeSentence,
        inmateId,
        maxReleaseDate,
        minReleaseDate,
        state,
        image,
      },
      select: {
        id: true,
        name: true,
        facilityName: true,
        lifeSentence: true,
        inmateId: true,
        maxReleaseDate: true,
        minReleaseDate: true,
        state: true,
        createdAt: true,
        image: true,
      },
    });

    return newartist as ArtistResponseDto;
  }

  async getAllArtists(): Promise<ArtistResponseDto[]> {
    const artists = await this.prisma.artist.findMany({
      select: {
        id: true,
        name: true,
        facilityName: true,
        lifeSentence: true,
        inmateId: true,
        maxReleaseDate: true,
        minReleaseDate: true,
        state: true,
        createdAt: true,
        image: true,
      },
    });
    return artists;
  }

  async uploadArtwork(
    artwork: ArtWorkUploadRequestDto,
    user: any,
    file: Express.Multer.File,
  ): Promise<ArtWorkUploadResponseDto> {
    const id = user.sub;
    const role = user.role;
    if (role !== 'ADMIN') {
      throw new BadRequestException('Unauthorized');
    }
    const admin = await this.prisma.user.findUnique({ where: { id } });
    if (!admin) {
      throw new BadRequestException('User not found');
    }
    const artworkImage = await this.uploadService.uploadSingleFile(file);
    const { title, isAnonymous, category, buyItNowPrice, startingBidPrice } =
      artwork;
    let { artistId } = artwork;
    if (isAnonymous) {
      artistId = null;
    } else {
      if (!artistId) {
        throw new BadRequestException(
          'artistId is required when artwork is not anonymous',
        );
      }
    }
    const newArtwork = await this.prisma.artwork.create({
      data: {
        title,
        isAnonymous,
        category,
        buyItNowPrice,
        startingBidPrice,
        artistId,
        imageUrl: artworkImage,
      },
      select: {
        id: true,
        title: true,
        isAnonymous: true,
        category: true,
        buyItNowPrice: true,
        startingBidPrice: true,
        artistId: true,
        createdAt: true,
        imageUrl: true,
        ...(isAnonymous === false && { artist: { select: { name: true } } }),
      },
    });

    return newArtwork;
  }
}
