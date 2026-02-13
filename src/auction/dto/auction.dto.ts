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

export class ExtendAuctionDto {
  @IsDateString()
  newEndAt: Date;
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

export class AuctionDetailsResponseDto {
  id: string;
  artworkId: string;
  artworkTitle: string;

  startPrice: number;
  currentPrice: number;

  startAt: Date;
  endAt: Date;
  secondsRemaining: number;

  status: AuctionStatus;

  highestBidderId?: string;
  highestBidderName?: string;

  userBidStatus?: 'WINNING' | 'OUTBID' | 'LOST' | 'NOT_PARTICIPATED';
}

export class UserAuctionHistoryItemDto {
  auctionId: string;
  artworkId: string;
  artworkTitle: string;
  imageUrl: string;

  myLastBid: number;
  highestBid: number;

  auctionStatus: AuctionStatus;
  userBidStatus: 'WINNING' | 'OUTBID' | 'LOST';

  endAt: Date;
  secondsRemaining: number;
}

export class UserAuctionHistoryResponseDto extends PaginatedResponseDto<UserAuctionHistoryItemDto> {}
