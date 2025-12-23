import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PROFILE_UPDATE = 'profile_update',
  COURSE_CREATE = 'course_create',
  COURSE_UPDATE = 'course_update',
  COURSE_DELETE = 'course_delete',
  ENROLLMENT = 'enrollment',
  EXAM_SUBMIT = 'exam_submit',
  PAYMENT = 'payment',
  CERTIFICATE_ISSUED = 'certificate_issued',
  TWO_FA_ENABLED = 'two_fa_enabled',
  TWO_FA_DISABLED = 'two_fa_disabled',
}

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  activityType: ActivityType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  entityType: string; // course, exam, payment, etc.

  @Column({ nullable: true })
  entityId: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}
