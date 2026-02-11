import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { Review } from '../../reviews/entities/review.entity';
import { Wishlist } from '../../wishlists/entities/wishlist.entity';
import { Payment } from '../../payments/entities/payment.entity';
export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  ALL_LEVELS = 'all_levels',
}

export enum CourseStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  shortDescription: string;

  @Column({ nullable: true })
  thumbnail: string;

  @Column({ nullable: true })
  previewVideo: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountPrice: number;

  @OneToMany(() => Payment, (payment) => payment.course)
  payments: Payment[];

  @Column({
    type: 'enum',
    enum: CourseLevel,
    default: CourseLevel.BEGINNER,
  })
  level: CourseLevel;

  @Column({
    type: 'enum',
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
  })
  @Index()
  status: CourseStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'int', default: 0 })
  duration: number; // in minutes

  @Column({ type: 'simple-array', nullable: true })
  requirements: string[];

  @Column({ type: 'simple-array', nullable: true })
  outcomes: string[];

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ default: 0 })
  enrollmentCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ default: 0 })
  reviewCount: number;

  @Column({ default: false })
  @Index()
  isFeatured: boolean;

  @Column({ default: false })
  @Index()
  isBestseller: boolean;

  @ManyToOne(() => User, (user) => user.courses, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @Column({ nullable: true })
  @Index()
  teacherId: string;

  @ManyToOne(() => Category, (category) => category.courses, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ nullable: true })
  @Index()
  categoryId: string;

  @OneToMany(() => Lesson, (lesson) => lesson.course)
  lessons: Lesson[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[];

  @OneToMany(() => Review, (review) => review.course)
  reviews: Review[];

  @OneToMany(() => Wishlist, (wishlist) => wishlist.course)
  wishlists: Wishlist[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
  notes: any;
}
