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

export enum TemplateStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('certificate_templates')
export class CertificateTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  @Index()
  courseId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @Column()
  @Index()
  teacherId: string;

  @Column({ default: 'Vĩnh viễn' })
  validityPeriod: string;

  @Column({ default: '#1a1a2e' })
  backgroundColor: string;

  @Column({ default: '#d4af37' })
  borderColor: string;

  @Column({ default: 'double' })
  borderStyle: string;

  @Column({ default: '#ffffff' })
  textColor: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  signatureUrl: string;

  @Column({ nullable: true })
  templateImageUrl: string;

  @Column({ default: 'classic' })
  templateStyle: string;

  @Column({ default: 'star' })
  badgeStyle: string;

  @Column({
    type: 'enum',
    enum: TemplateStatus,
    default: TemplateStatus.DRAFT,
  })
  status: TemplateStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ default: 0 })
  issuedCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
