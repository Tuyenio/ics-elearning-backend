import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exam } from './exam.entity';
import { User } from '../../users/entities/user.entity';

export enum AttemptStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  TIMED_OUT = 'timed_out',
}

export interface QuestionAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect?: boolean;
  earnedPoints?: number;
}

@Entity('exam_attempts')
export class ExamAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Exam, (exam) => exam.attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'examId' })
  exam: Exam;

  @Column()
  examId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column()
  studentId: string;

  @Column({ type: 'simple-json', nullable: true })
  answers: QuestionAnswer[];

  @Column({ type: 'float', default: 0 })
  score: number;

  @Column({ type: 'float', default: 0 })
  earnedPoints: number;

  @Column({ type: 'float', default: 0 })
  totalPoints: number;

  @Column({
    type: 'enum',
    enum: AttemptStatus,
    default: AttemptStatus.IN_PROGRESS,
  })
  status: AttemptStatus;

  @Column({ default: false })
  passed: boolean;

  @Column({ default: false })
  certificateIssued: boolean;

  @Column({ nullable: true })
  certificateId: string;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ default: 0 })
  timeSpent: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

