import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class SepayWebhookDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsIn(['in', 'out'])
  transferType: 'in' | 'out';

  @IsNumber()
  transferAmount: number;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  transactionDate?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;
}
