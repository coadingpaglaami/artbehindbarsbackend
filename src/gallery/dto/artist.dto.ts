import { Type } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Artist, Artwork, Category } from 'src/database/prisma-client/client';

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
  'artistId' | 'title' | 'isAnonymous' | 'category' |'startingBidPrice'
> & {
  buyItNowPrice: string | number;
};

export type ArtWorkUploadResponseDto = ArtWorkUploadRequestDto &
  Pick<Artwork, 'id' | 'createdAt' | 'imageUrl'>;

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
  | 'startingBidPrice'
  | 'createdAt'
  | 'imageUrl'
> & {
  artist: ArtworkArtistDto | null;
};




export class GetArtworksQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(Category)
  @Type(() => String)  // 🔥 important: transforms query param to string
  category?: Category;
}