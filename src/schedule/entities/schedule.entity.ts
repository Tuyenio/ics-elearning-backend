import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('schedule_items')
export class ScheduleItem {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  title: string

  @Column()
  course: string

  @Column()
  type: 'lesson' | 'exam' | 'live'

  @Column()
  status: 'todo' | 'in-progress' | 'completed'

  @Column()
  time: string

  @Column()
  duration: string

  @Column({ nullable: true })
  dueDate: string

  @Column({ default: false })
  completed: boolean

  @Column({ nullable: true })
  important: boolean

  @Column({ type: 'text', nullable: true })
  description: string

  @Column('text', { array: true, default: [] })
  tags: string[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
