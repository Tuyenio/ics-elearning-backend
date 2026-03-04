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
import { LessonProgress } from '../../lesson-progress/entities/lesson-progress.entity';

export enum LessonType {
  VIDEO = 'video',
  ARTICLE = 'article',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
  RESOURCE = 'resource',
}

@Entity('lessons', { schema: 'learning' })
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: LessonType,
    default: LessonType.VIDEO,
  })
  type: LessonType;

  @Column({ nullable: true })
  videoUrl: string;

  @Column({ nullable: true })
  videoThumbnail: string;

  @Column({ type: 'int', default: 0 })
  duration: number; // in seconds

  @Column({ type: 'text', nullable: true })
  content: string; // For article type

  @Column({ type: 'simple-json', nullable: true })
  resources: any[]; // Downloadable resources

  @Column({ default: 0 })
  order: number;

  @Column({ nullable: true })
  sectionTitle: string; // Frontend section grouping label

  @Column({ default: false })
  isFree: boolean;

  @Column({ default: false })
  isPublished: boolean;

  @ManyToOne(() => Course, (course) => course.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  @Index()
  courseId: string;

  @OneToMany(() => LessonProgress, (progress) => progress.lesson)
  progress: LessonProgress[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
