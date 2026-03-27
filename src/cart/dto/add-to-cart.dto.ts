import { IsUUID, IsNotEmpty } from 'class-validator';

export class AddToCartDto {
  @IsUUID('all')
  @IsNotEmpty()
  courseId: string;
}

