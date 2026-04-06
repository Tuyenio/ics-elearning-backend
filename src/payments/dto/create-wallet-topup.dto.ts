import { IsNumber, Max, Min } from 'class-validator';

export class CreateWalletTopupDto {
  @IsNumber()
  @Min(10000)
  @Max(100000000)
  amount: number;
}
