import { IsUUID } from 'class-validator';

export class CreateConnectionDto {
  @IsUUID()
  receiverId: string;
}
