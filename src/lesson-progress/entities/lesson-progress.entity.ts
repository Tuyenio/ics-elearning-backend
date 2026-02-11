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
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';

@Entity('lesson_progress')
@Index(['enrollmentId', 'lessonId'], { unique: true })
export class LessonProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Enrollment, (enrollment) => enrollment.lessonProgress, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: Enrollment;

  @Column()
  @Index()
  enrollmentId: string;

  @ManyToOne(() => Lesson, (lesson) => lesson.progress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @Column()
  @Index()
  lessonId: string;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progress: number; // 0-100

  @Column({ type: 'int', default: 0 })
  lastPosition: number; // Last video position in seconds

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
