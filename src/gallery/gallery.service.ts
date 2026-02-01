import { Injectable } from '@nestjs/common';
import { ArtistRequestDto, ArtistResponseDto } from './dto/artist.dto';
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
}
