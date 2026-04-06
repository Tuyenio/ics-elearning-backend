import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserWallet } from './entities/user-wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';

type WalletAdjustmentOptions = {
  paymentId?: string | null;
  instructorSubscriptionPaymentId?: string | null;
  description?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(UserWallet)
    private readonly walletRepository: Repository<UserWallet>,
    @InjectRepository(WalletTransaction)
    private readonly transactionRepository: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  private normalizeAmount(value: number): number {
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) {
      throw new BadRequestException('Invalid amount');
    }
    return Number(normalized.toFixed(2));
  }

  async getOrCreateWallet(userId: string): Promise<UserWallet> {
    const existing = await this.walletRepository.findOne({ where: { userId } });
    if (existing) {
      return existing;
    }

    try {
      const created = this.walletRepository.create({
        userId,
        balance: 0,
        currency: 'VND',
        isActive: true,
      });
      return await this.walletRepository.save(created);
    } catch {
      const raceResolved = await this.walletRepository.findOne({
        where: { userId },
      });
      if (!raceResolved) {
        throw new BadRequestException('Unable to initialize wallet');
      }
      return raceResolved;
    }
  }

  async getWalletByUser(userId: string): Promise<UserWallet> {
    return this.getOrCreateWallet(userId);
  }

  async getBalance(userId: string): Promise<{ balance: number; currency: string }> {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      balance: Number(wallet.balance || 0),
      currency: wallet.currency || 'VND',
    };
  }

  async getTransactions(userId: string, limit = 100): Promise<WalletTransaction[]> {
    const wallet = await this.getOrCreateWallet(userId);

    return this.transactionRepository.find({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['payment', 'instructorSubscriptionPayment'],
    });
  }

  async creditBalance(
    userId: string,
    amount: number,
    type: string,
    options: WalletAdjustmentOptions = {},
  ): Promise<{ wallet: UserWallet; transaction: WalletTransaction }> {
    return this.adjustBalance(userId, Math.abs(this.normalizeAmount(amount)), type, options);
  }

  async debitBalance(
    userId: string,
    amount: number,
    type: string,
    options: WalletAdjustmentOptions = {},
  ): Promise<{ wallet: UserWallet; transaction: WalletTransaction }> {
    return this.adjustBalance(userId, -Math.abs(this.normalizeAmount(amount)), type, options);
  }

  private async adjustBalance(
    userId: string,
    changeAmount: number,
    type: string,
    options: WalletAdjustmentOptions,
  ): Promise<{ wallet: UserWallet; transaction: WalletTransaction }> {
    const normalizedChange = this.normalizeAmount(changeAmount);
    if (normalizedChange === 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    return this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(UserWallet);
      const txRepo = manager.getRepository(WalletTransaction);

      let wallet = await walletRepo
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.userId = :userId', { userId })
        .getOne();

      if (!wallet) {
        wallet = await walletRepo.save(
          walletRepo.create({
            userId,
            balance: 0,
            currency: 'VND',
            isActive: true,
          }),
        );

        wallet = await walletRepo
          .createQueryBuilder('wallet')
          .setLock('pessimistic_write')
          .where('wallet.id = :walletId', { walletId: wallet.id })
          .getOneOrFail();
      }

      const currentBalance = Number(wallet.balance || 0);
      const nextBalance = Number((currentBalance + normalizedChange).toFixed(2));

      if (nextBalance < 0) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      wallet.balance = nextBalance;
      const savedWallet = await walletRepo.save(wallet);

      const transaction = txRepo.create({
        walletId: savedWallet.id,
        paymentId: options.paymentId ?? null,
        instructorSubscriptionPaymentId:
          options.instructorSubscriptionPaymentId ?? null,
        changeAmount: normalizedChange,
        balanceAfter: nextBalance,
        type,
        description: options.description ?? null,
        metadata: options.metadata ?? null,
      });

      const savedTransaction = await txRepo.save(transaction);
      return { wallet: savedWallet, transaction: savedTransaction };
    });
  }
}
