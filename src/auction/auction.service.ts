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
import {
  AuctionStatus,
  NotificationType,
} from 'src/database/prisma-client/enums';
import { SocketService } from 'src/socket/socket.service';

@Injectable()
export class AuctionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socket: SocketService,
  ) {}

  /** 🔑 Centralized auction status resolver */
  private resolveAuctionStatus(startAt: Date, endAt: Date): AuctionStatus {
    const now = new Date();

    if (now < startAt) return AuctionStatus.Upcoming;
    if (now >= startAt && now < endAt) return AuctionStatus.Ongoing;
    return AuctionStatus.Ended;
  }

  // ---------------- CREATE AUCTION ----------------
  async createAuction(dto: CreateAuctionDto): Promise<AuctionResponseDto> {
    // 1️⃣ Validate artwork
    const artwork = await this.prisma.artwork.findUnique({
      where: { id: dto.artworkId },
    });

    if (!artwork) {
      throw new BadRequestException('Artwork not found');
    }

    // 2️⃣ Convert dates ONCE (DTO values are strings)
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    const now = new Date();

    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (endAt.getTime() <= startAt.getTime()) {
      throw new BadRequestException('endAt must be after startAt');
    }

    // 3️⃣ Prevent duplicate auctions for same artwork
    const existingAuction = await this.prisma.auction.findFirst({
      where: { artworkId: dto.artworkId },
    });

    if (existingAuction) {
      throw new BadRequestException('This artwork is already in an auction');
    }

    // 4️⃣ Compute start price (45% of buyItNowPrice)
    const startPrice = Number((artwork.buyItNowPrice * 0.45).toFixed(2));

    // 5️⃣ Compute initial status (CORRECT DATE COMPARISON)
    const status: AuctionStatus =
      startAt.getTime() > now.getTime()
        ? AuctionStatus.Upcoming
        : AuctionStatus.Ongoing;

    // 6️⃣ Create auction
    const auction = await this.prisma.auction.create({
      data: {
        artworkId: dto.artworkId,
        startPrice,
        currentPrice: startPrice,
        startAt, // ✅ Date object
        endAt, // ✅ Date object
        status,
      },
      include: {
        artwork: true,
      },
    });

    // 7️⃣ Map response
    return this.mapAuctionDto(auction);
  }

  // ---------------- PLACE BID ----------------
  async placeBid(userId: string, dto: PlaceBidDto): Promise<AuctionBidDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      // 1️⃣ Fetch auction
      const auction = await tx.auction.findUnique({
        where: { id: dto.auctionId },
      });

      if (!auction) throw new BadRequestException('Auction not found');
      if (auction.status !== 'Ongoing')
        throw new BadRequestException('Auction is not active');

      // 2️⃣ Get current highest bid
      const highestBid = await tx.auctionBid.findFirst({
        where: { auctionId: dto.auctionId },
        orderBy: { bidPrice: 'desc' },
      });

      // 3️⃣ If same user already highest bidder → block
      if (highestBid && highestBid.userId === userId) {
        throw new BadRequestException(
          'You are already the highest bidder. Wait for another user to bid.',
        );
      }

      // 4️⃣ Minimum bid check (based on latest currentPrice)
      const minBid = +(auction.currentPrice * 1.05).toFixed(2);
      if (dto.bidPrice < minBid) {
        throw new BadRequestException(
          `Bid must be at least 5% higher than current price (${minBid})`,
        );
      }

      // 5️⃣ Conditional update (race condition protection)
      const updated = await tx.auction.updateMany({
        where: {
          id: dto.auctionId,
          currentPrice: auction.currentPrice,
        },
        data: { currentPrice: dto.bidPrice },
      });

      if (updated.count === 0) {
        throw new BadRequestException(
          'Bid failed. Another user placed a higher bid just now.',
        );
      }

      // 6️⃣ Save bid
      const bid = await tx.auctionBid.create({
        data: {
          auctionId: dto.auctionId,
          userId,
          bidPrice: dto.bidPrice,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return {
        userId,
        bidPrice: dto.bidPrice,
        createdAt: bid.createdAt,
        firstName: bid.user.firstName,
        lastName: bid.user.lastName,
      };
    });

    this.socket.emitToAuction(dto.auctionId, 'auction:newBid', {
      auctionId: dto.auctionId,
      ...result,
    });

    return result;
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
        artwork: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
          },
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
        artworkTitle: auction.artwork.title ?? '',
        imageUrl: auction.artwork.imageUrl ?? '',

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
        orderBy: { createdAt: 'desc' }, // 🔹 newest first

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

    const now = new Date();

    // 1️⃣ Fetch ALL auctions (status is dynamic, not DB truth)
    const auctions = await this.prisma.auction.findMany({
      orderBy: { startAt: 'desc' },
      include: { artwork: true },
    });

    // 2️⃣ Map + compute dynamic status
    let mapped = auctions.map((a) => {
      let status: AuctionStatus;

      if (now < a.startAt) {
        status = AuctionStatus.Upcoming;
      } else if (now >= a.startAt && now < a.endAt) {
        status = AuctionStatus.Ongoing;
      } else {
        status = AuctionStatus.Ended;
      }

      return {
        id: a.id,
        artworkId: a.artworkId,
        artworkTitle: a.artwork?.title ?? '',
        startPrice: a.startPrice,
        currentPrice: a.currentPrice,
        startAt: a.startAt,
        endAt: a.endAt,
        status,
      };
    });

    // 3️⃣ Filter by status (admin tabs)
    if (query.status) {
      mapped = mapped.filter((auction) => auction.status === query.status);
    }

    // 4️⃣ Pagination AFTER filtering
    const total = mapped.length;
    const paginatedData = mapped.slice(skip, skip + limit);

    return {
      data: paginatedData,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async finalizeAuction(auctionId: string) {
    const topBid = await this.prisma.auctionBid.findFirst({
      where: { auctionId },
      orderBy: { bidPrice: 'desc' },
    });

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });
    if (!topBid || !auction || !auction.artworkId) return;

    const due = new Date();
    due.setHours(due.getHours() + 48);

    await this.prisma.$transaction(async (tx) => {
      // 1️⃣ Create pending order
      const order = await tx.order.create({
        data: {
          squarePaymentId: '',
          auctionId,
          artworkId: auction.artworkId,
          buyerId: topBid.userId,
          totalAmount: topBid.bidPrice,
          paymentDueAt: due,
          status: 'PENDING',
        },
      });

      // 2️⃣ Create notification
      const notification = await tx.notification.create({
        data: {
          userId: topBid.userId,
          title: 'Auction Won',
          message: `You have 48 hours to complete payment. Please pay $${topBid.bidPrice} for artwork ${process.env.FRONTEND_URL}/order/${order.id} to avoid suspension.`,
          type: NotificationType.PAYMENT,
        },
      });

      // 3️⃣ Mark auction ended
      await tx.auction.update({
        where: { id: auctionId },
        data: { status: AuctionStatus.Ended },
      });

      // 4️⃣ Emit notification via socket
      this.socket.emitToUser(topBid.userId, 'notification', notification);
    });
  }

  async suspendUnpaidUsers() {
    const overdue = await this.prisma.order.findMany({
      where: {
        status: 'PENDING',
        paymentDueAt: { lt: new Date() },
      },
    });

    for (const order of overdue) {
      const suspendUntil = new Date();
      suspendUntil.setMonth(suspendUntil.getMonth() + 2);

      await this.prisma.user.update({
        where: { id: order.buyerId },
        data: {
          isSuspended: true,
          suspendedUntil: suspendUntil,
        },
      });

      await this.prisma.notification.create({
        data: {
          userId: order.buyerId,
          title: 'Account Suspended',
          message: 'Auction payment missed. Account suspended for 2 months.',
        },
      });

      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });
    }
  }

  // ---------------- AUTO STATUS UPDATE ----------------
  async updateAuctionStatuses() {
    const now = new Date();

    // Upcoming → Ongoing
    await this.prisma.auction.updateMany({
      where: {
        status: AuctionStatus.Upcoming,
        startAt: { lte: now },
        endAt: { gt: now },
      },
      data: { status: AuctionStatus.Ongoing },
    });

    // Ongoing → Ended
    await this.prisma.auction.updateMany({
      where: {
        status: AuctionStatus.Ongoing,
        endAt: { lte: now },
      },
      data: { status: AuctionStatus.Ended },
    });
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

  async getOrderByAuctionId(orderId: string) {
    return this.prisma.order.findFirst({
      where: { id: orderId },
      include: {
        buyer: {
          select: { id: true, email: true, firstName: true },
        },
        artwork: {
          select: { id: true, title: true, imageUrl: true },
        },
        auction: {
          select: { id: true, currentPrice: true },
        },   
      },
    });
  }
}
