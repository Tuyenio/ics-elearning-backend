import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  OneToMany,
  Index,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';

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

@Entity('users')
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToMany('Course', (course: any) => course.teacher)
  courses: any[];

  @OneToMany('Enrollment', (enrollment: any) => enrollment.student)
  enrollments: any[];

  @OneToMany('Review', (review: any) => review.student)
  reviews: any[];

  @OneToMany('Wishlist', (wishlist: any) => wishlist.student)
  wishlists: any[];

  @OneToMany('Payment', (payment: any) => payment.student)
  payments: any[];

  @OneToMany('Note', (note: any) => note.student)
  notes: any[];

  @OneToMany('Notification', (notification: any) => notification.user)
  notifications: any[];

  @OneToMany('Cart', (cart: any) => cart.user)
  cartItems: any[];

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
      this.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=random&size=200`;
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}
