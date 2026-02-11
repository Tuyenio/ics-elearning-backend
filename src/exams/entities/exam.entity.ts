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
import { Course } from '../../courses/entities/course.entity';
import { User } from '../../users/entities/user.entity';

export enum ExamType {
  PRACTICE = 'practice', // Thi thử - luyện tập
  OFFICIAL = 'official', // Thi thật - cấp chứng chỉ
}

export enum ExamStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface ExamQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_in';
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  points: number;
  explanation?: string;
}

@Entity('exams')
export class Exam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ExamType,
    default: ExamType.PRACTICE,
  })
  type: ExamType;

  @Index()
  @Column({
    type: 'enum',
    enum: ExamStatus,
    default: ExamStatus.DRAFT,
  })
  status: ExamStatus;

  @Column({ type: 'simple-json' })
  questions: ExamQuestion[];

  @Column({ type: 'int', default: 60 })
  timeLimit: number; // Thời gian làm bài (phút)

  @Column({ default: 70 })
  passingScore: number; // Điểm đạt (%)

  @Column({ default: 3 })
  maxAttempts: number; // Số lần thi tối đa

  @Column({ default: true })
  shuffleQuestions: boolean;

  @Column({ default: true })
  showCorrectAnswers: boolean; // Hiển thị đáp án sau khi thi

  @Column({ nullable: true })
  certificateTemplateId: string; // ID của mẫu chứng chỉ (chỉ cho thi thật)

  @Column({ nullable: true, type: 'text' })
  rejectionReason: string | null; // Lý do từ chối

  // Relations
  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Index()
  @Column()
  courseId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @Index()
  @Column()
  teacherId: string;

  @OneToMany('ExamAttempt', 'exam')
  attempts: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
