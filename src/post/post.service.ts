import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import {
  AdminGetPostsQueryDto,
  CategoryResponse,
  CreateCategoryDto,
  CreateCommentDto,
  CreatePostDto,
  CreateReportDto,
  CreateStateDto,
  GetPostQueryDto,
  PostResponse,
  StateResponse,
} from './dto/post.dto';
import { UploadService } from 'src/upload/upload.service';
import { PaginatedResponseDto } from '../common/dto/pagination-response.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';

import { AccountService } from 'src/account/account.service';
import { ProgressService } from 'src/progress/progress.service';
import { UserActivityType } from 'src/database/prisma-client/enums';
import { SocketService } from 'src/socket/socket.service';
import { title } from 'process';

@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly progressService: ProgressService,
    private readonly socketService: SocketService,
  ) {}

  // =======================
  // SHARED SELECT
  // =======================

  private postSelect() {
    return {
      id: true,
      title: true,
      content: true,
      imageUrl: true,
      videoUrl: true,
      createdAt: true,
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      state: { select: { id: true, name: true } },
      topic: { select: { id: true, name: true } },
      _count: { select: { likes: true, comments: true } },
      comments: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: { select: { id: true, firstName: true, lastName: true } },
          replies: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              user: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      },
      reports: {
        select: {
          id: true,
          reason: true,
          status: true,
          createdAt: true,
        },
      },
    };
  }

  async createPost(
    userId: string,
    dto: CreatePostDto,
    images?: Express.Multer.File[],
    video?: Express.Multer.File,
  ) {
    // Validate state
    const state = await this.prisma.state.findUnique({
      where: { id: dto.stateId },
      select: { id: true },
    });

    if (!state) throw new BadRequestException('Invalid state');

    // Validate topic
    const topic = await this.prisma.topics.findUnique({
      where: { id: dto.topicId },
      select: { id: true },
    });

    if (!topic) throw new BadRequestException('Invalid topic');

    // Upload images
    let imageUrls: string[] = [];
    if (images && images.length > 0) {
      imageUrls = await this.uploadService.uploadMultipleImages(
        images,
        'posts/images',
      );
    }

    // Upload video
    let videoUrl: string | null = null;
    if (video) {
      videoUrl = await this.uploadService.uploadVideo(video, 'posts/videos');
    }

    const post = await this.prisma.post.create({
      data: {
        title: dto.title,
        content: dto.content,
        user: { connect: { id: userId } },
        state: { connect: { id: dto.stateId } },
        topic: { connect: { id: dto.topicId } }, // <-- Ensure topicId is provided
        imageUrl: imageUrls,
        videoUrl: videoUrl ?? '',
      },
      select: this.postSelect(),
    });

    // Log activity
    await this.progressService.award(
      userId,
      UserActivityType.CREATE_POST,
      post.id,
    );
    return post;
  }

  async getPostById(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: this.postSelect(),
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async getUserAllPost(
    userId: string,
    query: GetPostQueryDto,
  ): Promise<PaginatedResponseDto<PostResponse>> {
    const { page = 1, limit = 10 } = query;
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Invalid pagination parameters');
    }
    const limitNum = Number(limit);

    const posts = await this.prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: this.postSelect(),
      skip: (page - 1) * limitNum,
      take: limitNum,
    });
    return {
      data: posts as PostResponse[],
      meta: {
        total: await this.prisma.post.count({ where: { userId } }),
        page,
        limit,
        totalPages: Math.ceil(
          (await this.prisma.post.count({ where: { userId } })) / limitNum,
        ),
      },
    };
  }

  // =======================
  // POSTS (AUTH)
  // =======================

  // =======================
  // LIKE
  // =======================

  async toggleLike(userId: string, postId: string) {
    const LIKE_POINTS = 5;

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId === userId) {
      throw new ForbiddenException('You cannot like your own post');
    }

    const existing = await this.prisma.like.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    // 🔥 If already liked → UNLIKE → deduct points
    if (existing) {
      await this.prisma.$transaction([
        // Remove like
        this.prisma.like.delete({
          where: { id: existing.id },
        }),

        // Deduct points safely
        this.prisma.user.update({
          where: { id: userId },
          data: {
            point: {
              decrement: LIKE_POINTS,
            },
          },
        }),

        // Log point transaction (negative)
        this.prisma.pointTransaction.create({
          data: {
            userId,
            activity: UserActivityType.LIKE,
            points: -LIKE_POINTS,
          },
        }),

        // Remove activity log
        this.prisma.userActivity.deleteMany({
          where: {
            userId,
            type: UserActivityType.LIKE,
            refId: postId,
          },
        }),
      ]);

      return { liked: false };
    }

    // 🔥 If not liked → LIKE → add points
    await this.prisma.$transaction([
      // Create like
      this.prisma.like.create({
        data: { userId, postId },
      }),

      // Add points
      this.prisma.user.update({
        where: { id: userId },
        data: {
          point: {
            increment: LIKE_POINTS,
          },
        },
      }),

      // Log point transaction
      this.prisma.pointTransaction.create({
        data: {
          userId,
          activity: UserActivityType.LIKE,
          points: LIKE_POINTS,
        },
      }),

      // Log activity
      this.prisma.userActivity.create({
        data: {
          userId,
          type: UserActivityType.LIKE,
          refId: postId,
        },
      }),
    ]);

    return { liked: true };
  }

  // =======================
  // COMMENT
  // =======================

  async createComment(userId: string, postId: string, dto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { postId: true },
      });

      if (!parent || parent.postId !== postId) {
        throw new BadRequestException('Invalid parent comment');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        userId,
        postId,
        parentId: dto.parentId ?? null,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: { id: true, firstName: true },
        },
      },
    });

    this.progressService.award(userId, UserActivityType.COMMENT, comment.id);

    return comment;
  }

  async getComments(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.prisma.comment.findMany({
      where: { postId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: { id: true, firstName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =======================
  // REPORT
  // =======================

  async reportPost(userId: string, postId: string, dto: CreateReportDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const alreadyReported = await this.prisma.report.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (alreadyReported) {
      throw new ConflictException('You already reported this post');
    }

    return this.prisma.report.create({
      data: {
        userId,
        postId,
        reason: dto.reason,
        message: dto.message,
      },
      select: {
        id: true,
        reason: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async getAllPosts(query: GetPostQueryDto) {
    const {
      page = 1,
      limit = 10,
      stateId,
      topicId,
      recent,
      popular,
      search,
    } = query;
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    let pageNum = Number(page);
    let limitNum = Number(limit);

    const where: any = {};

    if (stateId) where.stateId = stateId;
    if (topicId) where.topicId = topicId;

    let orderBy: any = { createdAt: 'desc' };

    if (popular) {
      orderBy = { likes: { _count: 'desc' } };
    }

    if (recent) {
      orderBy = { createdAt: 'desc' };
    }

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
      where.content = { contains: search, mode: 'insensitive' };
    }

    const total = await this.prisma.post.count({ where });

    const posts = await this.prisma.post.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy,
      select: this.postSelect(),
    });

    return {
      data: posts,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    } as PaginatedResponseDto<PostResponse>;
  }

  async createCategory(dto: CreateCategoryDto) {
    console.log(dto.name);
    const existing = await this.prisma.topics.findUnique({
      where: { name: dto.name },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Category with this name already exists');
    }
    return this.prisma.topics.create({
      data: { name: dto.name },
    });
  }

  async createState(dto: CreateStateDto) {
    const existing = await this.prisma.state.findUnique({
      where: { name: dto.name },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('State with this name already exists');
    }
    return this.prisma.state.create({
      data: { name: dto.name },
    });
  }

  async getAllCategories(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<CategoryResponse>> {
    const { page = 1, limit = 10 } = query;
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    const total = await this.prisma.topics.count();
    const categories = await this.prisma.topics.findMany({
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
      },
    });

    return {
      data: categories,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    } as PaginatedResponseDto<CategoryResponse>;
  }

  async updateCategory(categoryId: string, dto: CreateCategoryDto) {
    const existing = await this.prisma.topics.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Category not found');
    }
    return this.prisma.topics.update({
      where: { id: categoryId },
      data: { name: dto.name },
    });
  }

  async deleteCategory(categoryId: string) {
    const existing = await this.prisma.topics.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Category not found');
    }
    return this.prisma.topics.delete({
      where: { id: categoryId },
    });
  }

  async deleteState(stateId: string) {
    const existing = await this.prisma.state.findUnique({
      where: { id: stateId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('State not found');
    }
    return this.prisma.state.delete({
      where: { id: stateId },
    });
  }

  async updateState(stateId: string, dto: CreateStateDto) {
    const existing = await this.prisma.state.findUnique({
      where: { id: stateId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('State not found');
    }
    return this.prisma.state.update({
      where: { id: stateId },
      data: { name: dto.name },
    });
  }

  async getAllStates(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<StateResponse>> {
    const { page = 1, limit = 10 } = query;
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    const total = await this.prisma.state.count();
    const states = await this.prisma.state.findMany({
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
      },
    });

    return {
      data: states,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    } as PaginatedResponseDto<StateResponse>;
  }
  async getReportedPosts(
    query: AdminGetPostsQueryDto,
  ): Promise<PaginatedResponseDto<any>> {
    const { page = 1, limit = 10, minReports = 4 } = query;
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    const posts = await this.prisma.post.findMany({
      where: {
        reports: {
          some: {},
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
          },
        },
        reports: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
              },
            },
          },
        },
      },
    });

    // Filter posts having >= minReports
    const filtered = posts.filter((p) => p.reports.length >= minReports);

    // Apply pagination
    const total = filtered.length;
    const paginatedPosts = filtered.slice((page - 1) * limit, page * limit);

    const data = paginatedPosts.map((post) => ({
      postId: post.id,
      title: post.title,
      content: post.content,
      userName: post.user.firstName,
      userId: post.user.id,
      reportCount: post.reports.length,
      reports: post.reports.map((r) => ({
        userFirstName: r.user.firstName,
        message: r.message,
        reason: r.reason,
      })),
    }));

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

  async adminDeletePost(postId: string) {
    await this.prisma.$transaction([
      this.prisma.like.deleteMany({ where: { postId } }),
      this.prisma.comment.deleteMany({ where: { postId } }),
      this.prisma.report.deleteMany({ where: { postId } }),
      this.prisma.post.delete({ where: { id: postId } }),
    ]);

    return { message: 'Post deleted successfully' };
  }

  async adminSuspendUser(userId: string, days: number) {
    const suspendUntil = new Date();
    suspendUntil.setDate(suspendUntil.getDate() + days);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended: true,
        suspendedUntil: suspendUntil,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId,
        title: 'Account Suspended',
        message: `Your account has been suspended for ${days} days.`,
      },
    });

    return {
      message: `User suspended for ${days} days`,
    };
  }

  async unSuspendUser(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended: false,
        suspendedUntil: null,
      },
    });
    return {
      message: 'User unsuspended successfully',
    };
  }

  async warnUser(userId: string, reason: string) {
    await this.prisma.notification.create({
      data: {
        userId,
        title: 'Account Warning',
        message: `You have received a warning: ${reason}`,
        type: 'WARNING',
      },
    });

    this.socketService.emitToUser(userId, 'user-warning', {
      title: 'Account Warning',
      message: reason,
    });
    return {
      message: 'User has been warned successfully',
    };
  }
}
