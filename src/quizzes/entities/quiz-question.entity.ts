import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Quiz } from './quiz.entity';
import { QuizAnswer } from './quiz-answer.entity';

@Entity('quiz_questions', { schema: 'learning' })
export class QuizQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Quiz, (quiz) => quiz.quizQuestions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quizId' })
  quiz: Quiz;

  @Index()
  @Column()
  quizId: string;

  @Column({ type: 'text' })
  contentHtml: string;

  @Column({ type: 'text', nullable: true })
  image: string;

  @Column({ type: 'int', nullable: true })
  difficulty: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  topic: string;

  @Column({ type: 'text', nullable: true })
  learningObj: string;

  @Column({ type: 'text', nullable: true })
  globalObj: string;

  @Column({ type: 'int', default: 1 })
  questionOrder: number;

  @OneToMany(() => QuizAnswer, (answer) => answer.question, {
    cascade: true,
  })
  answers: QuizAnswer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
