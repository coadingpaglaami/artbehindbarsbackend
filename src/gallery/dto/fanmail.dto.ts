import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

import { FanMailStatus } from 'src/database/prisma-client/enums';

export class CreateFanMailDto {
  @IsString()
  message: string;
}

export class ReplyFanMailDto {
  @IsString()
  message: string;
}

export class FanMailQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(FanMailStatus)
  status?: FanMailStatus;

  @IsOptional()
  isArchived?: boolean;
}