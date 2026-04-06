import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payment } from '../../payments/entities/payment.entity';
import { InstructorSubscriptionPayment } from '../../instructor-subscriptions/entities/instructor-subscription-payment.entity';
import { UserWallet } from './user-wallet.entity';

@Entity('wallet_transactions', { schema: 'learning' })
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'integer' })
  @Index()
  walletId!: number;

  @ManyToOne(() => UserWallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'walletId' })
  wallet!: UserWallet;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  paymentId!: string | null;

  @ManyToOne(() => Payment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'paymentId' })
  payment!: Payment | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  instructorSubscriptionPaymentId!: string | null;

  @ManyToOne(() => InstructorSubscriptionPayment, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'instructorSubscriptionPaymentId' })
  instructorSubscriptionPayment!: InstructorSubscriptionPayment | null;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  changeAmount!: number;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  balanceAfter!: number;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  type!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
