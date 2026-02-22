import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class OverviewService {
  constructor(private prisma: PrismaService) {}

  async getTotalOverview() {
    const now = new Date();

    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const endOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    const [
      totalUsers,
      currentUsers,
      previousUsers,

      totalArtworks,
      currentArtworks,
      previousArtworks,

      totalActiveAuctions,
      currentActiveAuctions,
      previousActiveAuctions,

      totalRevenue,
      currentRevenue,
      previousRevenue,
    ] = await this.prisma.$transaction([
      // USERS
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { createdAt: { gte: startOfCurrentMonth } },
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: startOfPreviousMonth,
            lte: endOfPreviousMonth,
          },
        },
      }),

      // ARTWORKS
      this.prisma.artwork.count({ where: { isDeleted: false } }),
      this.prisma.artwork.count({
        where: {
          isDeleted: false,
          createdAt: { gte: startOfCurrentMonth },
        },
      }),
      this.prisma.artwork.count({
        where: {
          isDeleted: false,
          createdAt: {
            gte: startOfPreviousMonth,
            lte: endOfPreviousMonth,
          },
        },
      }),

      // ACTIVE AUCTIONS
      this.prisma.auction.count({
        where: { status: 'Ongoing' },
      }),
      this.prisma.auction.count({
        where: {
          status: 'Ongoing',
          createdAt: { gte: startOfCurrentMonth },
        },
      }),
      this.prisma.auction.count({
        where: {
          status: 'Ongoing',
          createdAt: {
            gte: startOfPreviousMonth,
            lte: endOfPreviousMonth,
          },
        },
      }),

      // REVENUE
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'COMPLETED' },
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startOfCurrentMonth },
        },
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: startOfPreviousMonth,
            lte: endOfPreviousMonth,
          },
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        change: this.calculateGrowth(currentUsers, previousUsers),
      },
      artworks: {
        total: totalArtworks,
        change: this.calculateGrowth(currentArtworks, previousArtworks),
      },
      activeAuctions: {
        total: totalActiveAuctions,
        change: this.calculateGrowth(
          currentActiveAuctions,
          previousActiveAuctions,
        ),
      },
      revenue: {
        total: totalRevenue._sum.totalAmount || 0,
        change: this.calculateGrowth(
          currentRevenue._sum.totalAmount || 0,
          previousRevenue._sum.totalAmount || 0,
        ),
      },
    };
  }

  async getRevenueTrends() {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Get all completed orders for this year
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(currentYear, 0, 1),
          lte: new Date(currentYear, 11, 31, 23, 59, 59),
        },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });
    const totalArworkSales = await this.prisma.artwork.count({
      where: {
        isSold: true,
      },
    });

    const monthlyMap: Record<string, number> = {};

    for (let i = 0; i < 12; i++) {
      const monthName = new Date(0, i).toLocaleString('default', {
        month: 'short',
      });
      monthlyMap[monthName] = 0;
    }

    let totalRevenue = 0;

    orders.forEach((order) => {
      const monthName = order.createdAt.toLocaleString('default', {
        month: 'short',
      });
      monthlyMap[monthName] += order.totalAmount;
      totalRevenue += order.totalAmount;
    });

    const totalSales = Object.entries(monthlyMap).map(([month, revenue]) => ({
      month,
      revenue,
    }));

    const avgSales = totalRevenue / 12;

    return {
      totalRevenue,
      avgSales: Number(avgSales.toFixed(2)),
      totalSales,
      totalArworkSales,
    };
  }

  async getArtworkCategoryStats() {
    const religious = await this.prisma.artwork.count({
      where: { category: 'Religious', isDeleted: false },
    });

    const nonReligious = await this.prisma.artwork.count({
      where: { category: 'Non_Religious', isDeleted: false },
    });

    const total = religious + nonReligious;

    return {
      religiousPercentage: total ? ((religious / total) * 100).toFixed(2) : 0,
      nonReligiousPercentage: total
        ? ((nonReligious / total) * 100).toFixed(2)
        : 0,
    };
  }

  async getTopArtists() {
    const artists = await this.prisma.artist.findMany({
      include: {
        artworks: {
          where: { isSold: true },
        },
      },
    });

    const result = artists.map((artist) => ({
      artistName: artist.name,
      totalArtwork: artist.artworks.length,
    }));

    result.sort((a, b) => b.totalArtwork - a.totalArtwork);

    return result.slice(0, 5); // top 5
  }

  async getAuctionPerformance(timeframe: 'Upcoming' | 'Ongoing' | 'Ended') {
    // 1️⃣ Get counts for all statuses
    const [ongoing, upcoming, ended] = await this.prisma.$transaction([
      this.prisma.auction.count({
        where: { status: 'Ongoing' },
      }),
      this.prisma.auction.count({
        where: { status: 'Upcoming' },
      }),
      this.prisma.auction.count({
        where: { status: 'Ended' },
      }),
    ]);

    // 2️⃣ Get total for selected timeframe
    const total = await this.prisma.auction.count({
      where: { status: timeframe },
    });

    let lastHighBids: any[] = [];

    // 3️⃣ Only fetch bids if timeframe is Ongoing or Ended
    if (timeframe === 'Ongoing' || timeframe === 'Ended') {
      lastHighBids = await this.prisma.auctionBid.findMany({
        where: {
          auction: {
            status: timeframe,
          },
        },
        orderBy: {
          bidPrice: 'desc',
        },
        take: 3,
        select: {
          bidPrice: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          auction: {
            select: {
              artwork: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      });

      // Clean response format
      lastHighBids = lastHighBids.map((bid) => ({
        bidderName: `${bid.user.firstName} ${bid.user.lastName}`,
        price: bid.bidPrice,
        artworkTitle: bid.auction.artwork.title,
      }));
    }

    return {
      ongoing,
      upcoming,
      ended,
      selected: {
        total,
        lastHighBids,
      },
    };
  }
  
  private calculateGrowth(current: number, previous: number) {
    if (previous === 0) {
      return {
        percentage: current > 0 ? 100 : 0,
        trend: current > 0 ? 'UP' : 'SAME',
      };
    }

    const percentage = ((current - previous) / previous) * 100;

    return {
      percentage: Number(percentage.toFixed(2)),
      trend: percentage > 0 ? 'UP' : percentage < 0 ? 'DOWN' : 'SAME',
    };
  }
}
