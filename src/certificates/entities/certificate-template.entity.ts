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
import { Course } from '../../courses/entities/course.entity';

export enum CertificateTemplateStatus {
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

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  templateImageUrl: string; // URL ảnh mẫu chứng chỉ

  @Column({ type: 'simple-json', nullable: true })
  templateData: {
    backgroundColor?: string;
    borderColor?: string;
    logoUrl?: string;
    signatureUrl?: string;
    fontSize?: number;
    fontFamily?: string;
    layout?: string;
  };

  @Column({
    type: 'enum',
    enum: CertificateTemplateStatus,
    default: CertificateTemplateStatus.DRAFT,
  })
  status: CertificateTemplateStatus;

  @Column({ nullable: true, type: 'text' })
  rejectionReason: string;

  @Column({ default: 'Vĩnh viễn' })
  validityPeriod: string; // Thời hạn hiệu lực

  // Relations
  @ManyToOne(() => Course, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ nullable: true })
  courseId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @Column()
  teacherId: string;

  @Column({ default: 0 })
  issuedCount: number; // Số lượng chứng chỉ đã cấp

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

