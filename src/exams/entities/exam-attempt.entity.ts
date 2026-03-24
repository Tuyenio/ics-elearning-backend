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

function toSafeText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function normalizeQuestionAnswers(value: unknown): QuestionAnswer[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: QuestionAnswer[] = value
    .filter((item): item is Record<string, unknown> => {
      return typeof item === 'object' && item !== null;
    })
    .map((item) => {
      const rawAnswer = item.answer;
      const normalizedAnswer = Array.isArray(rawAnswer)
        ? rawAnswer.map((entry) => toSafeText(entry)).filter(Boolean)
        : toSafeText(rawAnswer);

      return {
        questionId: toSafeText(item.questionId),
        answer: normalizedAnswer,
        isCorrect:
          typeof item.isCorrect === 'boolean' ? item.isCorrect : undefined,
        earnedPoints:
          typeof item.earnedPoints === 'number' ? item.earnedPoints : undefined,
      };
    });

  return normalized;
}

function serializeQuestionAnswers(value: unknown): QuestionAnswer[] {
  return normalizeQuestionAnswers(value);
}

@Entity('exam_attempts', { schema: 'learning' })
export class ExamAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Exam, (exam) => exam.attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'examId' })
  exam: Exam;

  @Index()
  @Column()
  examId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Index()
  @Column()
  studentId: string;

  @Column({
    type: 'simple-json',
    nullable: true,
    transformer: {
      to: (value: unknown) => {
        if (value === null || value === undefined) {
          return null;
        }
        return serializeQuestionAnswers(value);
      },
      from: (value: unknown): QuestionAnswer[] =>
        normalizeQuestionAnswers(value),
    },
  })
  answers: QuestionAnswer[];

  @Column({ type: 'float', default: 0 })
  score: number;

  @Column({ type: 'float', default: 0 })
  earnedPoints: number;

  @Column({ type: 'float', default: 0 })
  totalPoints: number;

  @Index()
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

  @Column({ type: 'int', default: 0 })
  timeSpent: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
