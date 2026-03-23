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
import { Course } from '../../courses/entities/course.entity';
import { User } from '../../users/entities/user.entity';

export enum ExtractedExamType {
  PRACTICE = 'practice',
  OFFICIAL = 'official',
}

export enum ExtractedExamStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface ExamVariant {
  code: number;
  questions: ExtractedExamQuestion[];
}

export interface ExtractedExamQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_in';
  question: string;
  image?: string;
  options?: string[];
  correctAnswer: string | string[];
  points: number;
  explanation?: string;
  chapter?: string;
  difficulty?: number | string;
}

@Entity('extracted_exams', { schema: 'learning' })
export class ExtractedExam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ExtractedExamType,
    default: ExtractedExamType.PRACTICE,
  })
  type: ExtractedExamType;

  @Index()
  @Column({
    type: 'enum',
    enum: ExtractedExamStatus,
    default: ExtractedExamStatus.APPROVED,
  })
  status: ExtractedExamStatus;

  @Column({ type: 'jsonb', nullable: false })
  questions: ExtractedExamQuestion[];

  @Column({ type: 'int', default: 60 })
  timeLimit: number;

  @Column({ type: 'int', default: 70 })
  passingScore: number;

  @Column({ type: 'int', default: 3 })
  maxAttempts: number;

  @Column({ default: true })
  shuffleQuestions: boolean;

  @Column({ default: false })
  shuffleAnswers: boolean;

  @Column({ default: true })
  showCorrectAnswers: boolean;

  @Index()
  @Column({ type: 'timestamp', nullable: true })
  availableFrom: Date | null;

  @Index()
  @Column({ type: 'timestamp', nullable: true })
  availableUntil: Date | null;

  @Column({ type: 'uuid', nullable: true })
  certificateTemplateId: string | null;

  @Column({ type: 'int', default: 1 })
  variantCount: number;

  @Column({ type: 'jsonb', nullable: true })
  variants: ExamVariant[] | null;

  @Column({ type: 'uuid', nullable: true })
  sourceExamId: string | null;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
