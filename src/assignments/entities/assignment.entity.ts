import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';

export enum AssignmentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}

export enum SubmissionStatus {
  NOT_SUBMITTED = 'not_submitted',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  LATE = 'late',
}

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Index()
  @Column({ name: 'course_id' })
  courseId: string;

  @Index()
  @Column({ name: 'lesson_id', nullable: true })
  lessonId: string;

  @Index()
  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'max_score', type: 'int', default: 100 })
  maxScore: number;

  @Index()
  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate: Date;

  @Index()
  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    default: AssignmentStatus.DRAFT,
  })
  status: AssignmentStatus;

  @Column({ name: 'allow_late_submission', default: false })
  allowLateSubmission: boolean;

  @Column({ type: 'text', nullable: true })
  instructions: string;

  @Column({ type: 'simple-array', nullable: true })
  attachments: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => Lesson, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;
}

@Entity('assignment_submissions')
export class AssignmentSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assignment_id' })
  assignmentId: string;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'simple-array', nullable: true })
  attachments: string[];

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.NOT_SUBMITTED,
  })
  status: SubmissionStatus;

  @Column({ type: 'int', nullable: true })
  score: number;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @Column({ name: 'graded_by', nullable: true })
  gradedBy: string;

  @Column({ name: 'graded_at', type: 'timestamp', nullable: true })
  gradedAt: Date;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Assignment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment: Assignment;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'graded_by' })
  grader: User;
}
