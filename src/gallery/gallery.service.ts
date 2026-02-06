import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ArtistRequestDto,
  ArtistResponseDto,
  ArtworkResponseDto,
  ArtWorkUploadRequestDto,
  ArtWorkUploadResponseDto,
  GetArtworksQueryDto,
} from './dto/artist.dto';
import { PrismaService } from 'src/database/prisma.service';
import { UploadService } from 'src/upload/upload.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';
import { Category, Prisma } from 'src/database/prisma-client/client';
import {
  CreateFanMailDto,
  FanMailQueryDto,
  ReplyFanMailDto,
} from './dto/fanmail.dto';

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

  async getAllArtists(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ArtistResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [artists, total] = await this.prisma.$transaction([
      this.prisma.artist.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
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
      }),
      this.prisma.artist.count(),
    ]);

    return {
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: artists,
    };
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
    const { title, category, buyItNowPrice, startingBidPrice } = artwork;
    let { artistId, isAnonymous } = artwork;
    if (artistId === undefined) {
      isAnonymous = true; // default to anonymous if artistId is not provided
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
        buyItNowPrice: parseFloat(buyItNowPrice as string),
        startingBidPrice,
        ...(isAnonymous ? {} : { artistId }),
        imageUrl: artworkImage,
      },
      select: {
        id: true,
        title: true,
        isAnonymous: true,
        category: true,
        buyItNowPrice: true,
        startingBidPrice: true,
        ...(isAnonymous ? {} : { artistId: true }),
        createdAt: true,
        imageUrl: true,
        ...(isAnonymous === false && { artist: { select: { name: true } } }),
      },
    });

    return newArtwork;
  }

  async getAllArtworks(
    query: GetArtworksQueryDto,
  ): Promise<PaginatedResponseDto<ArtworkResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    console.log(query.category);

    // ✅ Build optional filter
    const where: Prisma.ArtworkWhereInput = {
      ...(query.category && { category: query.category as Category }),
    };

    // ✅ Query DB with pagination and count
    const [artworks, total] = await this.prisma.$transaction([
      this.prisma.artwork.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          isAnonymous: true,
          category: true,
          buyItNowPrice: true,
          startingBidPrice: true,
          createdAt: true,
          imageUrl: true,
          artist: { select: { name: true } }, // fetch artist name
          auction: { select: { id: true } }, // check if artwork is in auction
        },
      }),
      this.prisma.artwork.count({ where }),
    ]);

    // ✅ Enforce anonymity: artist=null if isAnonymous
    const data: ArtworkResponseDto[] = artworks.map((artwork) => ({
      id: artwork.id,
      title: artwork.title,
      isAnonymous: artwork.isAnonymous,
      category: artwork.category,
      buyItNowPrice: artwork.buyItNowPrice,
      startingBidPrice: artwork.startingBidPrice,
      createdAt: artwork.createdAt,
      imageUrl: artwork.imageUrl,
      artist: artwork.isAnonymous ? null : artwork.artist,
      auctionId: artwork.auction?.id || null,
    }));

    // ✅ Return paginated response
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async sendFanMail(userId: string, artistId: string, dto: CreateFanMailDto) {
    return this.prisma.fanMail.create({
      data: {
        artistId,
        senderUserId: userId,
        subject: dto.subject,
        message: dto.message,
      },
    });
  }

  async getMyFanMails(userId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.fanMail.findMany({
        where: { senderUserId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { artist: true },
      }),
      this.prisma.fanMail.count({ where: { senderUserId: userId } }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async adminGetFanMails(query: FanMailQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.isArchived !== undefined) where.isArchived = query.isArchived;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.fanMail.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          artist: true,
          sender: true,
        },
      }),
      this.prisma.fanMail.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async adminGetFanMail(id: string) {
    const mail = await this.prisma.fanMail.findUnique({
      where: { id },
      include: {
        sender: true,
        artist: true,
        fanMailReplies: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!mail) throw new NotFoundException('Fan mail not found');
    return mail;
  }

  async adminReply(adminId: string, fanMailId: string, dto: ReplyFanMailDto) {
    await this.prisma.fanMailReply.create({
      data: {
        fanMailId,
        adminId,
        message: dto.message,
      },
    });

    return this.prisma.fanMail.update({
      where: { id: fanMailId },
      data: {
        status: 'REPLIED',
        repliedAt: new Date(),
      },
    });
  }

  async archiveFanMail(id: string) {
    return this.prisma.fanMail.update({
      where: { id },
      data: { isArchived: true, status: 'CLOSED' },
    });
  }
}
