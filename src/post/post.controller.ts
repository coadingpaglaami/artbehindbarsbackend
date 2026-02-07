import {
  Body,
  Controller,
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
  getAllPosts(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.postService.getAllPosts(+page, +limit);
  }

  @Get('states')
  getStates() {
    return this.postService.getAllStates();
  }

  @Get('categories')
  getCategories() {
    console.log('This Get Executing');
    return this.postService.getAllCategories();
  }

  @Get(':id')
  getPostById(@Param('id') postId: string) {
    return this.postService.getPostById(postId);
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
}
