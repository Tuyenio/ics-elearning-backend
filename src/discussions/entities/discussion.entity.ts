import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';

@Entity('discussions')
@Index(['courseId', 'lessonId'])
export class Discussion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Index()
  @Column({ name: 'course_id' })
  courseId: string;

  @Index()
  @Column({ name: 'lesson_id', nullable: true })
  lessonId: string;

  @Index()
  @Column({ name: 'author_id' })
  authorId: string;

  @Index()
  @Column({ name: 'parent_id', nullable: true })
  parentId: string;

  @Column({ name: 'is_pinned', default: false })
  isPinned: boolean;

  @Column({ name: 'is_resolved', default: false })
  isResolved: boolean;

  @Column({ name: 'reply_count', default: 0 })
  replyCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => Lesson, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @ManyToOne(() => Discussion, (discussion) => discussion.replies, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Discussion;

  @OneToMany(() => Discussion, (discussion) => discussion.parent)
  replies: Discussion[];
}
