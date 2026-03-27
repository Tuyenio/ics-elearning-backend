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

@Entity('schedule_items', { schema: 'learning' })
export class ScheduleItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  title: string;

  @Column()
  course: string;

  @Column()
  type: 'lesson' | 'exam' | 'live';

  @Column()
  status: 'todo' | 'in-progress' | 'completed';

  @Column()
  time: string;

  @Column()
  duration: string;

  @Column({ nullable: true })
  dueDate: string;

  @Column({ default: false })
  completed: boolean;

  @Column({ nullable: true })
  important: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
