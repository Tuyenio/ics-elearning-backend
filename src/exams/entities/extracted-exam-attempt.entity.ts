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
import { ExtractedExam } from './extracted-exam.entity';
import { User } from '../../users/entities/user.entity';

export interface ExtractedQuestionAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect?: boolean;
  earnedPoints?: number;
}

export interface ExtractedQuestionResult {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_in';
  question: string;
  image?: string;
  options: string[];
  userAnswer: string | string[] | undefined;
  correctAnswer: string | string[];
  explanation?: string;
  isCorrect: boolean;
}

@Entity('extracted_exam_attempts', { schema: 'learning' })
export class ExtractedExamAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ExtractedExam, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'extractedExamId' })
  exam: ExtractedExam;

  @Index()
  @Column()
  extractedExamId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Index()
  @Column()
  studentId: string;

  @Column({ type: 'jsonb', nullable: true })
  answers: ExtractedQuestionAnswer[];

  @Column({ type: 'jsonb', nullable: true })
  questionResults: ExtractedQuestionResult[];

  @Column({ type: 'float', default: 0 })
  score: number;

  @Column({ type: 'float', default: 0 })
  earnedPoints: number;

  @Column({ type: 'float', default: 0 })
  totalPoints: number;

  @Column({ default: false })
  passed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ type: 'int', nullable: true, default: null })
  variantCode: number | null;

  @Column({ type: 'int', default: 0 })
  timeSpent: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
