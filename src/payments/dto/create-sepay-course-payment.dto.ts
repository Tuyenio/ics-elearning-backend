import { IsOptional, IsString } from 'class-validator';

export class CreateSepayCoursePaymentDto {
  @IsString()
  courseId: string;

  @IsString()
  @IsOptional()
  couponCode?: string;
}
