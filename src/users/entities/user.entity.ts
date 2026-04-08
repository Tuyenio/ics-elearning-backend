import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  OneToMany,
  Index,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Course } from '../../courses/entities/course.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { Review } from '../../reviews/entities/review.entity';
import { Wishlist } from '../../wishlists/entities/wishlist.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Note } from '../../notes/entities/note.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { Cart } from '../../cart/entities/cart.entity';

export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

@Entity('users', { schema: 'learning' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  @Index()
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  @Index()
  status: UserStatus;

  @Column({ nullable: true })
  bio: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'text', nullable: true })
  emailVerificationToken?: string;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  emailVerifiedAt?: Date;

  @Column({ type: 'text', nullable: true })
  passwordResetToken?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpires?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ nullable: true })
  lastLoginProvider?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToMany(() => Course, (course) => course.teacher)
  courses: Course[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.student)
  enrollments: Enrollment[];

  @OneToMany(() => Review, (review) => review.student)
  reviews: Review[];

  @OneToMany(() => Wishlist, (wishlist) => wishlist.student)
  wishlists: Wishlist[];

  @OneToMany(() => Payment, (payment) => payment.student)
  payments: Payment[];

  @OneToMany(() => Note, (note) => note.student)
  notes: Note[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => Cart, (cart) => cart.user)
  cartItems: Cart[];

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 12);
    }
    // Set default avatar if not provided
    if (!this.avatar && this.name) {
      // Generate a default avatar URL based on user initials
      const initials = this.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
      // Use a default avatar service or generate a colored placeholder
      this.avatar = `https://ui-avatars.com/?name=${encodeURIComponent(initials)}&background=random&size=200`;
    }
  }

  @BeforeUpdate()
  async hashPasswordOnUpdate() {
    // Only hash password if it's been modified and isn't already hashed
    if (this.password && !this.password.startsWith('$2')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}
