import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import {
  AuctionBidDto,
  AuctionResponseDto,
  CreateAuctionDto,
  GetAuctionsQueryDto,
  PlaceBidDto,
  UserAuctionHistoryResponseDto,
} from './dto/auction.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';
import { AuctionStatus } from 'src/database/prisma-client/enums';

@Injectable()
export class AuctionService {
  constructor(private readonly prisma: PrismaService) {}

  /** 🔑 Centralized auction status resolver */
  private resolveAuctionStatus(startAt: Date, endAt: Date): AuctionStatus {
    const now = new Date();

    if (now < startAt) return AuctionStatus.Upcoming;
    if (now >= startAt && now < endAt) return AuctionStatus.Ongoing;
    return AuctionStatus.Ended;
  }

  // ---------------- CREATE AUCTION ----------------
  async createAuction(dto: CreateAuctionDto): Promise<AuctionResponseDto> {
    const artwork = await this.prisma.artwork.findUnique({
      where: { id: dto.artworkId },
    });

    if (!artwork) throw new BadRequestException('Artwork not found');

    // Check if auction already exists for this artwork
    const existingAuction = await this.prisma.auction.findFirst({
      where: { artworkId: dto.artworkId },
    });
    if (existingAuction) {
      throw new BadRequestException('This artwork is already in an auction');
    }

    // Validate start/end times
    const now = new Date();
    if (dto.endAt <= dto.startAt) {
      throw new BadRequestException('End time must be after start time');
    }

    // Compute starting price (45% of buyItNowPrice)
    const startPrice = +(artwork.buyItNowPrice * 0.45).toFixed(2);

    // Compute initial status
    const status: AuctionStatus = dto.startAt > now ? 'Upcoming' : 'Ongoing';

    const auction = await this.prisma.auction.create({
      data: {
        artworkId: dto.artworkId,
        startPrice,
        currentPrice: startPrice,
        startAt: dto.startAt,
        endAt: dto.endAt,
        status,
      },
      include: { artwork: true },
    });

    return this.mapAuctionDto(auction);
  }

  // ---------------- PLACE BID ----------------
  async placeBid(userId: string, dto: PlaceBidDto): Promise<AuctionBidDto> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: dto.auctionId },
    });
    if (!auction) throw new BadRequestException('Auction not found');

    // Only allow bids if ongoing
    if (auction.status !== 'Ongoing')
      throw new BadRequestException('Auction is not active');

    // Minimum bid: 5% higher than current price
    const minBid = +(auction.currentPrice * 1.05).toFixed(2);
    if (dto.bidPrice < minBid) {
      throw new BadRequestException(
        `Bid must be at least 5% higher than current price (${minBid})`,
      );
    }

    // Save bid
    const bid = await this.prisma.auctionBid.create({
      data: {
        auctionId: dto.auctionId,
        userId,
        bidPrice: dto.bidPrice,
      },
    });

    // Update auction currentPrice
    await this.prisma.auction.update({
      where: { id: dto.auctionId },
      data: { currentPrice: dto.bidPrice },
    });

    return {
      userId,
      bidPrice: dto.bidPrice,
      createdAt: bid.createdAt,
    };
  }

  // ---------------- GET SINGLE AUCTION ----------------
  async getAuction(id: string): Promise<AuctionResponseDto> {
    const auction = await this.prisma.auction.findUnique({
      where: { id },
      include: { artwork: true },
    });
    if (!auction) throw new NotFoundException('Auction not found');

    // Compute dynamic status
    const now = new Date();
    let status: AuctionStatus;
    if (now < auction.startAt) status = 'Upcoming';
    else if (now >= auction.startAt && now <= auction.endAt) status = 'Ongoing';
    else status = 'Ended';

    // Update DB status if needed
    if (auction.status !== status) {
      await this.prisma.auction.update({
        where: { id },
        data: { status },
      });
    }

    return this.mapAuctionDto({ ...auction, status });
  }

  async extendAuction(auctionId: string, newEndAt: Date) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) throw new NotFoundException();

    if (
      this.resolveAuctionStatus(auction.startAt, auction.endAt) !== 'Ongoing'
    ) {
      throw new BadRequestException('Only ongoing auctions can be extended');
    }

    if (newEndAt <= auction.endAt) {
      throw new BadRequestException('New end time must be later');
    }

    return this.prisma.auction.update({
      where: { id: auctionId },
      data: { endAt: newEndAt },
    });
  }

  async getUserAuctionHistory(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<UserAuctionHistoryResponseDto> {
    const { page, limit } = query;
    const skip =
      (typeof page === 'number' ? page - 1 : 0) *
      (typeof limit === 'number' ? limit : 10);

    // 1️⃣ find auctions where user placed at least one bid
    const auctions = await this.prisma.auction.findMany({
      where: {
        bids: {
          some: {
            userId,
          },
        },
      },
      include: {
        bids: {
          orderBy: { bidPrice: 'desc' },
        },
      },
      skip,
      take: limit,
    });

    const total = await this.prisma.auction.count({
      where: {
        bids: {
          some: {
            userId,
          },
        },
      },
    });

    const now = new Date();

    const data = auctions.map((auction) => {
      const status = this.resolveAuctionStatus(auction.startAt, auction.endAt);

      const highestBid = auction.bids[0];
      const myHighestBid = auction.bids.find((b) => b.userId === userId);

      let userBidStatus: 'WINNING' | 'OUTBID' | 'LOST';

      if (status === AuctionStatus.Ongoing) {
        userBidStatus = highestBid.userId === userId ? 'WINNING' : 'OUTBID';
      } else {
        userBidStatus = highestBid.userId === userId ? 'WINNING' : 'LOST';
      }

      return {
        auctionId: auction.id,
        artworkId: auction.artworkId,
        artworkTitle: 'TODO: join artwork table',

        myLastBid: myHighestBid?.bidPrice ?? 0,
        highestBid: highestBid.bidPrice,

        auctionStatus: status,
        userBidStatus,

        endAt: auction.endAt,
        secondsRemaining:
          status === AuctionStatus.Ongoing
            ? Math.max(
                0,
                Math.floor((auction.endAt.getTime() - now.getTime()) / 1000),
              )
            : 0,
      };
    });

    return {
      data,
      meta: {
        page: page || 1,
        limit: limit || 10,
        total,
        totalPages: Math.ceil(total / (limit || 10)),
      },
    };
  }

  // ---------------- GET PAGINATED BIDS ----------------
  async getAuctionBids(
    auctionId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<AuctionBidDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [bids, total] = await this.prisma.$transaction([
      this.prisma.auctionBid.findMany({
        where: { auctionId },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          bidPrice: true,
          createdAt: true,
        },
      }),
      this.prisma.auctionBid.count({ where: { auctionId } }),
    ]);

    const data: AuctionBidDto[] = bids.map((b) => ({
      userId: b.user.id,
      firstName: b.user.firstName,
      lastName: b.user.lastName,
      bidPrice: b.bidPrice,
      createdAt: b.createdAt,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ---------------- GET ALL AUCTIONS (ADMIN) ----------------
  async getAllAuctions(query: GetAuctionsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    // Fetch auctions with artwork info
    const [auctions] = await this.prisma.$transaction([
      this.prisma.auction.findMany({
        skip,
        take: limit,
        orderBy: { startAt: 'desc' },
        include: { artwork: true },
      }),
      this.prisma.auction.count(),
    ]);

    const now = new Date();

    // Compute dynamic status and map
    let mapped = auctions.map((a) => {
      let status: AuctionStatus;
      if (now < a.startAt) status = 'Upcoming';
      else if (now >= a.startAt && now <= a.endAt) status = 'Ongoing';
      else status = 'Ended';

      return {
        id: a.id,
        artworkId: a.artworkId,
        artworkTitle: a.artwork?.title || '',
        startPrice: a.startPrice,
        currentPrice: a.currentPrice,
        startAt: a.startAt,
        endAt: a.endAt,
        status,
      };
    });

    // Filter by status query param
    if (query.status) {
      mapped = mapped.filter((a) => a.status === query.status);
    }

    const total = mapped.length;

    return {
      data: mapped,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ---------------- MAPPER ----------------
  private mapAuctionDto(auction: any): AuctionResponseDto {
    return {
      id: auction.id,
      artworkId: auction.artworkId,
      artworkTitle: auction.artwork?.title || '',
      startPrice: auction.startPrice,
      currentPrice: auction.currentPrice,
      startAt: auction.startAt,
      endAt: auction.endAt,
      status: auction.status,
    };
  }
}
