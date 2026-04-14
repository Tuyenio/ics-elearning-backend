import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { Category } from '../../categories/entities/category.entity';

export enum CouponType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum CouponStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

export enum CouponApplyScope {
  ALL = 'all',
  COURSE = 'course',
  TEACHER = 'teacher',
  CATEGORY = 'category',
}

@Entity('coupons', { schema: 'learning' })
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'enum', enum: CouponType, default: CouponType.PERCENTAGE })
  type: CouponType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number;

  @Column({
    name: 'min_purchase',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  minPurchase: number;

  @Column({
    name: 'max_discount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  maxDiscount: number;

  @Column({ name: 'usage_limit', nullable: true })
  usageLimit: number;

  @Column({ name: 'used_count', default: 0 })
  usedCount: number;

  @Index()
  @Column({ name: 'course_id', nullable: true })
  courseId: string;

  @Index()
  @Column({
    name: 'apply_scope',
    type: 'varchar',
    length: 20,
    default: CouponApplyScope.ALL,
  })
  applyScope: CouponApplyScope;

  @Index()
  @Column({ name: 'teacher_id', nullable: true })
  teacherId: string;

  @Index()
  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @Index()
  @Column({ name: 'created_by' })
  createdBy: string;

  @Index()
  @Column({ type: 'enum', enum: CouponStatus, default: CouponStatus.ACTIVE })
  status: CouponStatus;

  @Index()
  @Column({ name: 'valid_from', type: 'timestamp', nullable: true })
  validFrom: Date;

  @Index()
  @Column({ name: 'valid_until', type: 'timestamp', nullable: true })
  validUntil: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Course, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
