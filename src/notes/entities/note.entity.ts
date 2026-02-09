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
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';

@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  studentId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column({ nullable: true })
  courseId: string;

  @ManyToOne(() => Course, course => course.notes, { nullable: true })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ nullable: true })
  lessonId: string;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', default: 0 })
  timestamp: number; // Video timestamp in seconds

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
