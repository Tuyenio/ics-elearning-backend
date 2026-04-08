import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateSepayCartPaymentDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  courseIds: string[];

  @IsString()
  @IsOptional()
  couponCode?: string;
}
