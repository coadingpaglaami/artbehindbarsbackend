import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { ReportReason, ReportStatus } from 'src/database/prisma-client/enums';

// ======================================================
// ===================== REQUEST DTOs ===================
// ======================================================

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsUUID()
  stateId: string;

  @IsUUID()
  topicId: string;
}

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class CreateReportDto {
  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsOptional()
  @IsString()
  message?: string;
}

// ======================================================
// ===================== RESPONSE TYPES =================
// ======================================================

// -------- Basic User Info --------
export interface UserBasicResponse {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}


// -------- State --------
export interface StateResponse {
  id: string;
  name: string;
}

// -------- Topic --------
export interface TopicResponse {
  id: string;
  name: string;
}

// -------- Comment Response --------
export interface CommentResponse {
  id: string;
  content: string;
  createdAt: Date;
  user: UserBasicResponse;   // <- REQUIRED
  replies?: CommentResponse[];
}

// -------- Post Response --------
// -------- Post Response --------
export interface PostResponse {
  id: string;
  title: string;
  content: string;
  imageUrl?: string[];
  videoUrl?: string;
  createdAt: Date;
    user: UserBasicResponse;

  state: StateResponse;
  topic: CategoryResponse; // renamed from 'topic' → 'category'

  _count: {
    likes: number;
    comments: number;
  };

  // Only returned when authenticated
  isLiked?: boolean;

  // Optional reports info (for admin)
  reports?: ReportResponse[];
  
  // Optional comments array
  comments?: CommentResponse[];
}


// -------- Like Toggle Response --------
export interface LikeToggleResponse {
  liked: boolean;
}

// -------- Report Response --------
export interface ReportResponse {
  id: string;
  reason: ReportReason;
  status: ReportStatus;
  createdAt: Date;
}



// -------- Pagination Response (optional but useful) --------
export interface PaginatedPostResponse {
  data: PostResponse[];
  page: number;
  limit: number;
}

// src/admin/dto/create-category.dto.ts
export class CreateCategoryDto {
  @IsString()
  name: string;
}

// src/admin/dto/create-state.dto.ts
export class CreateStateDto {
  @IsString()
  name: string;
}

// -------- State --------
export interface StateResponse {
  id: string;
  name: string;
}

// -------- Category --------
export interface CategoryResponse {
  id: string;
  name: string;
}

export interface GetPostQueryDto extends PaginationQueryDto {
  search?: string;
  stateId?: string;
  topicId?: string;
  recent?: boolean;
  popular?: boolean;
}

export interface AdminGetPostsQueryDto extends PaginationQueryDto {
  minReports?: number | 4; // default to 4 if not provided
}