import { Artist, Artwork } from 'src/database/prisma-client/client';

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
  'artistId' | 'title' | 'isAnonymous' | 'category' | 'buyItNowPrice' |'startingBidPrice'
>;

export type ArtWorkUploadResponseDto = ArtWorkUploadRequestDto &
  Pick<Artwork, 'id' | 'createdAt' | 'imageUrl'>;
