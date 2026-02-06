import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';
import { AuctionStatus } from 'src/database/prisma-client/enums';

export class CreateAuctionDto {
  @IsNotEmpty()
  artworkId: string;

  @IsDateString()
  startAt: Date;

  @IsDateString()
  endAt: Date;
}

// User: place bid
export class PlaceBidDto {
  @IsNotEmpty()
  auctionId: string;

  @IsNumber()
  @Min(0)
  bidPrice: number;
}

// Bid response
export type AuctionBidDto = {
  userId: string;
  firstName?: string;
  lastName?: string;
  bidPrice: number;
  createdAt: Date;
};

// Auction response
export type AuctionResponseDto = {
  id: string;
  artworkId: string;
  artworkTitle: string;
  startPrice: number;
  currentPrice: number;
  startAt: Date;
  endAt: Date;
  status: AuctionStatus;
};

// Paginated bids
export class AuctionBidsResponseDto extends PaginatedResponseDto<AuctionBidDto> {}

export class GetAuctionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(AuctionStatus)
  @Type(() => String) // 🔥 ensures query param is transformed to string
  status?: AuctionStatus;
}
