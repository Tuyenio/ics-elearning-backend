import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { InstructorPlan } from './instructor-plan.entity';
import { InstructorSubscription } from './instructor-subscription.entity';

export enum InstructorSubscriptionPaymentStatus {
  PAID = 'paid',
  PENDING = 'pending',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

@Entity('instructor_subscription_payments', { schema: 'learning' })
export class InstructorSubscriptionPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  transactionId: string;

  @Column()
  @Index()
  teacherId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @Column()
  @Index()
  planId: string;

  @ManyToOne(() => InstructorPlan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'planId' })
  plan: InstructorPlan;

  @Column({ type: 'varchar', nullable: true })
  subscriptionId: string | null;

  @ManyToOne(() => InstructorSubscription, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: InstructorSubscription;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: InstructorSubscriptionPaymentStatus,
    default: InstructorSubscriptionPaymentStatus.PAID,
  })
  @Index()
  status: InstructorSubscriptionPaymentStatus;

  @Column({ type: 'varchar', nullable: true })
  paymentMethod: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;
}
