import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { InstructorPlan } from './instructor-plan.entity';

export enum InstructorSubscriptionStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('instructor_subscriptions', { schema: 'learning' })
export class InstructorSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({
    type: 'enum',
    enum: InstructorSubscriptionStatus,
    default: InstructorSubscriptionStatus.ACTIVE,
  })
  @Index()
  status: InstructorSubscriptionStatus;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ default: false })
  autoRenew: boolean;

  @Column({ type: 'varchar', nullable: true })
  paymentMethod: string | null;

  @Column({ type: 'text', nullable: true })
  cancelReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
