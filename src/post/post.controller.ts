import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PostService } from './post.service';
import {
  CreateCategoryDto,
  CreateCommentDto,
  CreatePostDto,
  CreateReportDto,
  CreateStateDto,
} from './dto/post.dto';
import { Roles } from 'src/role/decorators/role.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type {
  AdminGetPostsQueryDto,
  CategoryResponse,
  GetPostQueryDto,
} from './dto/post.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 5 },
      { name: 'video', maxCount: 1 },
    ]),
  )
  async createPost(
    @Req() req: any,
    @Body() dto: CreatePostDto,
    @UploadedFiles()
    files: { images?: Express.Multer.File[]; video?: Express.Multer.File[] },
  ) {
    return this.postService.createPost(
      req.user.sub,
      dto,
      files?.images,
      files?.video?.[0],
    );
  }
  @Get()
  getAllPosts(@Query() query: GetPostQueryDto) {
    return this.postService.getAllPosts(query);
  }

  @Get('states')
  getStates(@Query() query: PaginationQueryDto) {
    return this.postService.getAllStates(query);
  }

  @Get('categories')
  async getCategories(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<CategoryResponse>> {
    console.log('This Get Executing');
    return await this.postService.getAllCategories(query);
  }

  @Get(':id')
  getPostById(@Param('id') postId: string) {
    return this.postService.getPostById(postId);
  }

  @Get(':id/user')
  @UseGuards(AuthGuard('jwt'))
  getPostDetails(@Param('id')  userId: string, @Query() query: GetPostQueryDto) {
    return this.postService.getUserAllPost(userId, query);
  }

  // =======================
  // AUTHENTICATED
  // =======================

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/like')
  toggleLike(@Req() req: any, @Param('id') postId: string) {
    return this.postService.toggleLike(req.user.sub, postId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/comment')
  comment(
    @Req() req: any,
    @Param('id') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    console.log(dto.content);
    return this.postService.createComment(req.user.sub, postId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/comment')
  getComments(@Param('id') postId: string) {
    return this.postService.getComments(postId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/report')
  report(
    @Req() req: any,
    @Param('id') postId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.postService.reportPost(req.user.sub, postId, dto);
  }

  // CATEGORY
  @Post('category')
  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  createCategory(@Body() dto: CreateCategoryDto) {
    console.log(dto);
    return this.postService.createCategory(dto);
  }

  // STATE
  @Post('state')
  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  createState(@Body() dto: CreateStateDto) {
    return this.postService.createState(dto);
  }

  // =======================
  // PATCH STATE (ADMIN)
  // =======================
  @Patch('state/:id')
  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  updateState(@Param('id') stateId: string, @Body() dto: CreateStateDto) {
    return this.postService.updateState(stateId, dto);
  }

  @Patch('category/:id')
  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  updateCategory(
    @Param('id') categoryId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.postService.updateCategory(categoryId, dto);
  }

  @Delete('state/:id')
  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  deleteState(@Param('id') stateId: string) {
    return this.postService.deleteState(stateId);
  }

  @Delete('category/:id')
  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  deleteCategory(@Param('id') categoryId: string) {
    return this.postService.deleteCategory(categoryId);
  }

  // =======================
  // ADMIN-ONLY
  // =======================

  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  @Get('admin/reported-posts')
  getReportedPosts(
    @Query() query: AdminGetPostsQueryDto,
  ): Promise<PaginatedResponseDto<any>> {
    return this.postService.getReportedPosts(query);
  }

  @Roles(['ADMIN'])
  @Delete('admin/posts/:id')
  @UseGuards(AuthGuard('jwt'))
  deletePost(@Param('id') postId: string) {
    return this.postService.adminDeletePost(postId);
  }

  @Roles(['ADMIN'])
  @Post('admin/users/:id/suspend')
  @UseGuards(AuthGuard('jwt'))
  suspendUser(@Param('id') userId: string, @Body('days') days: number) {
    return this.postService.adminSuspendUser(userId, days);
  }
}
