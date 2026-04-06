import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PAYPAL = 'paypal',
  BANK_TRANSFER = 'bank_transfer',
  WALLET = 'wallet',
  QR_CODE = 'qr_code',
  SEPAY_QR = 'sepay_qr',
  VNPAY = 'vnpay',
  MOMO = 'momo',
}

export enum PaymentType {
  COURSE_ENROLLMENT = 'course_enrollment',
  WALLET_TOPUP = 'wallet_topup',
}

@Entity('payments', { schema: 'learning' })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  transactionId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column({ nullable: true })
  @Index()
  studentId: string;

  @ManyToOne(() => Course, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ nullable: true })
  @Index()
  courseId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  finalAmount: number;

  @Column({
    type: 'enum',
    enum: PaymentType,
    default: PaymentType.COURSE_ENROLLMENT,
  })
  @Index()
  paymentType: PaymentType;

  @Column({ default: 'VND' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  @Index()
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.BANK_TRANSFER,
  })
  paymentMethod: PaymentMethod;

  @Column({ type: 'varchar', nullable: true })
  paymentGatewayId: string | null; // ID from payment gateway (VNPay, Momo, etc.)

  @Column({ type: 'varchar', nullable: true })
  gatewayTransactionId: string | null; // Transaction ID returned by payment gateway

  @Column({ type: 'varchar', nullable: true, unique: true })
  @Index()
  transactionCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  webhookProcessedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  sepayTransactionId: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: any | null; // Additional payment data

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
