import { Type } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { AuctionResponseDto } from 'src/auction/dto/auction.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

import {
  Artist,
  Artwork,
  Auction,
  Category,
} from 'src/database/prisma-client/client';

export type ArtistRequestDto = Pick<
  Artist,
  | 'name'
  | 'facilityName'
  | 'lifeSentence'
  | 'inmateId'
  | 'maxReleaseDate'
  | 'minReleaseDate'
  | 'state'
>;

export type ArtistResponseDto = ArtistRequestDto &
  Pick<Artist, 'id' | 'createdAt' | 'image'>;

export type ArtistUpdateDto = Partial<ArtistRequestDto>;

export type ArtWorkUploadRequestDto = Pick<
  Artwork,
  'artistId' | 'title' | 'isAnonymous' | 'category'
> & {
  buyItNowPrice: string | number;
};

export type ArtWorkUploadResponseDto = ArtWorkUploadRequestDto &
  Pick<Artwork, 'id' | 'createdAt' | 'imageUrl' | 'isSold'>;

export type ArtworkArtistDto = {
  name: string;
};

export type ArtworkResponseDto = Pick<
  Artwork,
  | 'id'
  | 'title'
  | 'isAnonymous'
  | 'category'
  | 'buyItNowPrice'
  | 'createdAt'
  | 'imageUrl'
  | 'isSold'
> & {
  artist: ArtworkArtistDto | null;
  auction: Pick<AuctionResponseDto,"id" | "currentPrice" | "startAt" | "endAt" | "status"> | null;
  auctionId: string | null;
};

export class GetArtworksQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(Category)
  @Type(() => String) // 🔥 important: transforms query param to string
  category?: Category;
  @IsOptional()
  searchTerm?: string;
}
export class GetArtistsQueryDto extends PaginationQueryDto {
  @IsOptional()
  searchTerm?: string;
}
