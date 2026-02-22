import { Injectable } from '@nestjs/common';
import { ActivityType } from 'src/database/prisma-client/enums';
import { ACTIVITY_POINTS, WEIGHTS } from './constants/progress.constant';
import { PrismaService } from 'src/database/prisma.service';
import { subDays } from 'date-fns';
import { UserEngagementDto } from './dto/progress.dto';
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}
  async award(userId: string, activity: ActivityType, refId?: string) {
    const points = ACTIVITY_POINTS[activity];
    if (!points) return;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { point: { increment: points } },
      }),

      this.prisma.pointTransaction.create({
        data: {
          userId,
          activity,
          points,
        },
      }),

      this.prisma.userActivity.create({
        data: {
          userId,
          type: activity,
          refId,
        },
      }),
    ]);
  }

  async getUserStatusStats() {
    const sevenDaysAgo = subDays(new Date(), 7);
    const thirtyDaysAgo = subDays(new Date(), 30);

    const active = await this.prisma.user.count({
      where: {
        userActivities: {
          some: { createdAt: { gte: sevenDaysAgo } },
        },
      },
    });

    const newUsers = await this.prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    const inactive = await this.prisma.user.count({
      where: {
        userActivities: {
          none: { createdAt: { gte: thirtyDaysAgo } },
        },
      },
    });

    return { active, newUsers, inactive };
  }

  async getEngagementTrend() {
    return this.prisma.$queryRaw`
    SELECT DATE("createdAt") as day,
           COUNT(*)::int as total
    FROM "UserActivity"
    WHERE "createdAt" >= NOW() - INTERVAL '7 days'
    GROUP BY day
    ORDER BY day ASC;
  `;
  }

  async getAverageScore() {
    const users = await this.prisma.user.findMany({
      select: { id: true },
    });

    let totalScore = 0;

    for (const user of users) {
      const activities = await this.prisma.userActivity.groupBy({
        by: ['type'],
        where: { userId: user.id },
        _count: true,
      });

      let rawScore = 0;

      activities.forEach((a) => {
        rawScore += WEIGHTS[a.type] * a._count;
      });

      const normalized = Math.min(100, rawScore / 10);
      totalScore += normalized;
    }

    return Math.round(totalScore / users.length);
  }

  async getUsersEngagement(
    query: { search?: string } & PaginationQueryDto,
  ): Promise<PaginatedResponseDto<UserEngagementDto>> {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const skip = (page - 1) * limit;
    const { search } = query;

    // 🔎 Search filter
    const whereClause = search
      ? {
          OR: [
            {
              firstName: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              lastName: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {};

    // 1️⃣ Total user count (with search)
    const total = await this.prisma.user.count({
      where: whereClause as any,
    });

    // 2️⃣ Fetch paginated users (with search)
    const users = await this.prisma.user.findMany({
      where: whereClause as any,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        isSuspended: true,
      },
    });

    if (users.length === 0) {
      return {
        data: [],
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    const userIds = users.map((u) => u.id);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 3️⃣ Group activities for these users
    const groupedActivities = await this.prisma.userActivity.groupBy({
      by: ['userId', 'type'],
      where: {
        userId: { in: userIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: {
        type: true,
      },
    });

    const activityMap: Record<string, Record<string, number>> = {};

    for (const item of groupedActivities) {
      if (!activityMap[item.userId]) {
        activityMap[item.userId] = {};
      }

      activityMap[item.userId][item.type] = item._count.type;
    }

    const result: UserEngagementDto[] = users.map((user) => {
      const counts = activityMap[user.id] || {};

      let rawScore = 0;

      for (const type in counts) {
        rawScore += (WEIGHTS[type] || 0) * counts[type];
      }

      const score = Math.min(100, Math.round(rawScore / 10));

      let status: 'Active' | 'Inactive' | 'New' | 'Suspended' = 'Inactive';

      if (user.isSuspended) {
        status = 'Suspended';
      } else if (user.createdAt >= sevenDaysAgo) {
        status = 'New';
      } else if (Object.keys(counts).length > 0) {
        status = 'Active';
      }

      return {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        createdAt: user.createdAt,
        status,
        score,
      };
    });

    return {
      data: result,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
