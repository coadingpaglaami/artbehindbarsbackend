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
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
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

    return this.prisma.post.create({
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

  // =======================
  // POSTS (AUTH)
  // =======================

  // =======================
  // LIKE
  // =======================

  async toggleLike(userId: string, postId: string) {
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

    if (existing) {
      await this.prisma.like.delete({
        where: { id: existing.id },
      });

      return { liked: false };
    }

    await this.prisma.like.create({
      data: { userId, postId },
    });

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

    return this.prisma.comment.create({
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
    const { page = 1, limit = 10, stateId, topicId, recent, popular } = query;
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    const where: any = {};

    if (stateId) where.stateId = stateId;
    if (topicId) where.topicId = topicId;

    let orderBy: any = { createdAt: 'desc' };

    if (popular) {
      orderBy = { likes: 'desc' }; // or likesCount
    }

    if (recent) {
      orderBy = { createdAt: 'desc' };
    }

    const total = await this.prisma.post.count({ where });

    const posts = await this.prisma.post.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
      select: this.postSelect(),
    });

    return {
      data: posts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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
        reports: {
          include: {
            user: {
              select: {
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
}
