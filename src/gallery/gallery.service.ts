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
  GetArtistsQueryDto,
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
    const image = await this.uploadService.uploadSingleImage(file);
    const newartist = await this.prisma.artist.create({
      data: {
        name,
        facilityName,
        lifeSentence,
        inmateId,
        maxReleaseDate: new Date(maxReleaseDate),
        minReleaseDate: new Date(minReleaseDate),
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
    query: GetArtistsQueryDto,
  ): Promise<PaginatedResponseDto<ArtistResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const searchTerm = query.searchTerm ? query.searchTerm : '';

    console.log(typeof searchTerm, searchTerm);

    const [artists, total] = await this.prisma.$transaction([
      this.prisma.artist.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { facilityName: { contains: searchTerm, mode: 'insensitive' } },
          ],
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

  async getArtistById(id: string): Promise<ArtistResponseDto> {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        facilityName: true,
        lifeSentence: true,
        inmateId: true,
        maxReleaseDate: true,
        minReleaseDate: true,
        state: true,
        image: true,
      },
    });
    if (!artist) {
      throw new NotFoundException('Artist not found');
    }
    return artist as ArtistResponseDto;
  }

  async getArtistArtwork(
    id: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ArtworkResponseDto>> {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
    });
    if (!artist) {
      throw new NotFoundException('Artist not found');
    }
    const artworks = await this.prisma.artwork.findMany({
      where: { artistId: artist.id },
      select: {
        id: true,
        title: true,
        category: true,
        buyItNowPrice: true,
        startingBidPrice: true,
        isAnonymous: true,
        createdAt: true,
        imageUrl: true,
      },
    });
    return {
      meta: {
        total: artworks.length,
        page: 1,
        limit: artworks.length,
        totalPages: 1,
      },
      data: artworks,
    } as PaginatedResponseDto<ArtworkResponseDto>;
  }

  async updateArtist(
    id: string,
    artist: Partial<ArtistRequestDto>,
    file?: Express.Multer.File,
  ): Promise<ArtistResponseDto> {
    const existingArtist = await this.prisma.artist.findUnique({
      where: { id },
    });
    if (!existingArtist) {
      throw new NotFoundException('Artist not found');
    }
    let image: string | undefined;
    if (file) {
      image = await this.uploadService.uploadSingleImage(file);
    }
    const updatedArtist = await this.prisma.artist.update({
      where: { id },
      data: {
        name: artist.name ?? existingArtist.name,
        facilityName: artist.facilityName ?? existingArtist.facilityName,
        lifeSentence: artist.lifeSentence ?? existingArtist.lifeSentence,
        inmateId: artist.inmateId ?? existingArtist.inmateId,
        maxReleaseDate: artist.maxReleaseDate
          ? new Date(artist.maxReleaseDate)
          : existingArtist.maxReleaseDate,
        minReleaseDate: artist.minReleaseDate
          ? new Date(artist.minReleaseDate)
          : existingArtist.minReleaseDate,
        state: artist.state ?? existingArtist.state,
        image: image ?? existingArtist.image,
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
        image: true,
      },
    });
    return updatedArtist as ArtistResponseDto;
  }

  async deleteArtist(id: string): Promise<{ message: string }> {
    const existingArtist = await this.prisma.artist.findUnique({
      where: { id },
    });
    await this.prisma.artwork.updateMany({
      where: { artistId: id },
      data: { artistId: null, isAnonymous: true },
    });

    if (!existingArtist) {
      throw new NotFoundException('Artist not found');
    }
    await this.prisma.artist.delete({
      where: { id },
    });
    return { message: 'Artist deleted successfully' };
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
    const artworkImage = await this.uploadService.uploadSingleImage(file);
    const { title, category, buyItNowPrice, startingBidPrice } = artwork;
    let { artistId, isAnonymous } = artwork;

    if (typeof isAnonymous === 'string' && isAnonymous === 'true') {
      isAnonymous = true;
    } else if (typeof isAnonymous === 'string' && isAnonymous === 'false') {
      isAnonymous = false;
    }
    if (isAnonymous === true) {
      artistId = null;
    } else {
      if (!artistId) {
        throw new BadRequestException(
          'artistId is required when artwork is not anonymous',
        );
      }
    }
    console.log(artistId);
    const newArtwork = await this.prisma.artwork.create({
      data: {
        title,
        isAnonymous, // Convert to boolean
        category,
        buyItNowPrice: parseFloat(buyItNowPrice as unknown as string),
        startingBidPrice: parseFloat(startingBidPrice as unknown as string),
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
    const searchTerm = query.searchTerm ? query.searchTerm : '';

    // ✅ Build optional filter
    const where: Prisma.ArtworkWhereInput = {
      ...(query.category && { category: query.category as Category }),
      ...(searchTerm && {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { artist: { name: { contains: searchTerm, mode: 'insensitive' } } },
        ],
      }),
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

  async getArtworkById(id: string): Promise<ArtworkResponseDto> {
    const artwork = await this.prisma.artwork.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        isAnonymous: true,
        category: true,
        buyItNowPrice: true,
        startingBidPrice: true,
        imageUrl: true,
        artist: { select: { name: true, id: true } },
      },
    });
    if (!artwork) {
      throw new NotFoundException('Artwork not found');
    }
    return artwork as ArtworkResponseDto;
  }

  async updateArtwork(
    id: string,
    artwork: Partial<ArtWorkUploadRequestDto>,
    file?: Express.Multer.File,
  ): Promise<ArtworkResponseDto> {
    const existingArtwork = await this.prisma.artwork.findUnique({
      where: { id },
    });
    if (!existingArtwork) {
      throw new NotFoundException('Artwork not found');
    }
    let imageUrl: string | undefined;
    if (file) {
      imageUrl = await this.uploadService.uploadSingleImage(file);
    }
    console.log(artwork.isAnonymous);
    if (
      typeof artwork.isAnonymous === 'string' &&
      artwork.isAnonymous === 'true'
    ) {
      artwork.isAnonymous = true;
    } else if (
      typeof artwork.isAnonymous === 'string' &&
      artwork.isAnonymous === 'false'
    ) {
      artwork.isAnonymous = false;
    }

    if (typeof artwork.buyItNowPrice === 'string') {
      artwork.buyItNowPrice = parseFloat(artwork.buyItNowPrice);
    }
    if (typeof artwork.startingBidPrice === 'string') {
      artwork.startingBidPrice = parseFloat(artwork.startingBidPrice);
    }
    if (artwork.isAnonymous === true) {
      artwork.artistId = null;
    }
    console.log(artwork.isAnonymous);
    const updatedArtwork = await this.prisma.artwork.update({
      where: { id },
      data: {
        title: artwork.title ?? existingArtwork.title,
        category: artwork.category ?? existingArtwork.category,
        buyItNowPrice: artwork.buyItNowPrice ?? existingArtwork.buyItNowPrice,
        startingBidPrice:
          artwork.startingBidPrice ?? existingArtwork.startingBidPrice,
        ...(imageUrl ? { imageUrl } : {}),
        isAnonymous:
          artwork.isAnonymous !== undefined
            ? artwork.isAnonymous
              ? true
              : false
            : existingArtwork.isAnonymous,
        artistId:
          artwork.artistId !== undefined
            ? artwork.artistId
            : existingArtwork.artistId,
      },

      select: {
        id: true,
        title: true,
        isAnonymous: true,
        category: true,
        buyItNowPrice: true,
        startingBidPrice: true,
        createdAt: true,
        imageUrl: true,
        ...(artwork.isAnonymous ? {} : { artist: { select: { name: true } } }),
      },
    });
    return updatedArtwork as ArtworkResponseDto;
  }

  async deleteArtwork(id: string): Promise<{ message: string }> {
    const existingArtwork = await this.prisma.artwork.findUnique({
      where: { id },
    });
    if (!existingArtwork) {
      throw new NotFoundException('Artwork not found');
    }
    await this.prisma.artwork.delete({
      where: { id },
    });
    return { message: 'Artwork deleted successfully' };
  }

  async sendFanMail(userId: string, artistId: string, dto: CreateFanMailDto) {
    return this.prisma.fanMail.create({
      data: {
        artistId,
        senderUserId: userId,
        subject: dto.subject,
        message: dto.message,
      },
      select: {
        id: true,
        subject: true,
        message: true,
        status: true,
        createdAt: true,
        artist: {
          select: {
            id: true,
            name: true,
          },
        },
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
        select: {
          id: true,
          subject: true,
          message: true,
          status: true,
          artist: {
            select: {
              id: true,
              name: true,
            },
          },
        },
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
        select: {
          id: true,
          subject: true,
          message: true,
          status: true,
          isArchived: true,
          createdAt: true,
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          artist: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.fanMail.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async adminGetFanMail(id: string) {
    const mail = await this.prisma.fanMail.findUnique({
      where: { id },
      select: {
        id: true,
        subject: true,
        message: true,
        status: true,
        isArchived: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        artist: {
          select: {
            id: true,
            name: true,
          },
        },
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
      select: {
        id: true,
        subject: true,
        message: true,
        status: true,
        isArchived: true,
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
