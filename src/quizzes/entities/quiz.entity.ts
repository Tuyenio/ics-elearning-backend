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
import { Lesson } from '../../lessons/entities/lesson.entity';
import { QuizAttempt } from './quiz-attempt.entity';

@Entity('quizzes', { schema: 'learning' })
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-json' })
  questions: any[]; // Array of question objects

  @Column({ type: 'int', default: 60 })
  timeLimit: number; // in minutes

  @Column({ default: 70 })
  passingScore: number; // percentage

  @Column({ default: 3 })
  maxAttempts: number;

  @Column({ default: true })
  showCorrectAnswers: boolean;

  @Column({ default: false })
  shuffleQuestions: boolean;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Index()
  @Column()
  courseId: string;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @Index()
  @Column({ nullable: true })
  lessonId: string;

  @OneToMany(() => QuizAttempt, (attempt) => attempt.quiz)
  attempts: QuizAttempt[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
