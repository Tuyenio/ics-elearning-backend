import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';

export enum CertificateStatus {
  APPROVED = 'approved',
  PENDING = 'pending',
  REJECTED = 'rejected',
}

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  certificateNumber: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column()
  @Index()
  studentId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  @Index()
  courseId: string;

  @OneToOne(() => Enrollment, (enrollment) => enrollment.certificate, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: Enrollment;

  @Column()
  @Index()
  enrollmentId: string;

  @Column({ type: 'timestamp' })
  issueDate: Date;

  @Column({ nullable: true })
  pdfUrl: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: any; // Additional certificate data

  @Column({
    type: 'enum',
    enum: CertificateStatus,
    default: CertificateStatus.APPROVED,
  })
  status: CertificateStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ nullable: true })
  shareId: string; // For public sharing

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
