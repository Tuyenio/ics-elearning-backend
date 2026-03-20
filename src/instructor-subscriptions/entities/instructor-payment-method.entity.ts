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

export enum InstructorPaymentMethodType {
  BANK_CARD = 'bank_card',
  E_WALLET = 'e_wallet',
}

@Entity('instructor_payment_methods', { schema: 'learning' })
export class InstructorPaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teacherId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @Column({
    type: 'enum',
    enum: InstructorPaymentMethodType,
  })
  @Index()
  type: InstructorPaymentMethodType;

  @Column({ type: 'varchar', nullable: true })
  provider: string | null;

  @Column({ type: 'varchar' })
  label: string;

  @Column({ type: 'varchar', nullable: true })
  cardLast4: string | null;

  @Column({ type: 'varchar', nullable: true })
  cardHolderName: string | null;

  @Column({ type: 'varchar', nullable: true })
  cardExpiry: string | null;

  @Column({ type: 'varchar', nullable: true })
  walletPhone: string | null;

  @Column({ default: false })
  @Index()
  isDefault: boolean;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
