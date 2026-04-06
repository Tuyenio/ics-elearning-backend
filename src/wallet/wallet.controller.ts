import { Controller, Get, UseGuards } from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import { WalletService } from './wallet.service';

@Controller('user-wallets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT, UserRole.TEACHER)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('my-wallet')
  getMyWallet(@GetUser() user: User) {
    return this.walletService.getWalletByUser(user.id);
  }

  @Get('my-balance')
  getMyBalance(@GetUser() user: User) {
    return this.walletService.getBalance(user.id);
  }

  @Get('my-transactions')
  getMyTransactions(@GetUser() user: User) {
    return this.walletService.getTransactions(user.id);
  }
}
