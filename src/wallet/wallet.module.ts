import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletController } from './wallet.controller';
import { UserWallet } from './entities/user-wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { WalletService } from './wallet.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserWallet, WalletTransaction])],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
