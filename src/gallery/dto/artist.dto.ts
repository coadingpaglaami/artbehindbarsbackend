import { Artist } from 'src/database/prisma-client/client';

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
