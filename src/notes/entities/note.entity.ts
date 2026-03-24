import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';

type NoteItem = {
  id: string;
  title: string;
  deadline?: string;
  priority?: 'high' | 'medium' | 'low';
  completed: boolean;
};

type NoteScheduleItem = {
  date: string;
  time: string;
  content: string;
};

const isPriority = (value: unknown): value is 'high' | 'medium' | 'low' =>
  value === 'high' || value === 'medium' || value === 'low';

const parseNoteItems = (value: unknown): NoteItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null,
    )
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : '',
      title: typeof item.title === 'string' ? item.title : '',
      deadline: typeof item.deadline === 'string' ? item.deadline : undefined,
      priority: isPriority(item.priority) ? item.priority : undefined,
      completed: item.completed === true,
    }));
};

const parseNoteSchedule = (value: unknown): NoteScheduleItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null,
    )
    .map((item) => ({
      date: typeof item.date === 'string' ? item.date : '',
      time: typeof item.time === 'string' ? item.time : '',
      content: typeof item.content === 'string' ? item.content : '',
    }));
};

const serializeNoteItems = (value: unknown): NoteItem[] | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return parseNoteItems(value);
};

const serializeNoteSchedule = (value: unknown): NoteScheduleItem[] | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return parseNoteSchedule(value);
};

@Entity('notes', { schema: 'learning' })
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

  @ManyToOne(() => Course, { nullable: true })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ nullable: true })
  lessonId: string;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @Column({ type: 'varchar', default: 'general' })
  type: 'general' | 'deadline' | 'checklist' | 'plan';

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'int', default: 0 })
  timestamp: number; // Video timestamp in seconds

  @Column({
    type: 'json',
    nullable: true,
    transformer: {
      to: (value?: NoteItem[] | null) => serializeNoteItems(value),
      from: (value?: unknown) => parseNoteItems(value),
    },
  })
  items: NoteItem[];

  @Column({
    type: 'json',
    nullable: true,
    transformer: {
      to: (value?: NoteScheduleItem[] | null) => serializeNoteSchedule(value),
      from: (value?: unknown) => parseNoteSchedule(value),
    },
  })
  schedule: NoteScheduleItem[];

  @Column({ type: 'boolean', default: false })
  isFavorite: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
