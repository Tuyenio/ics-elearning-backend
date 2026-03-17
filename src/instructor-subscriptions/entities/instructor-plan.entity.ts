import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('instructor_plans', { schema: 'learning' })
export class InstructorPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ default: 1 })
  durationMonths: number;

  @Column({ default: 2 })
  courseLimit: number;

  @Column({ type: 'int', nullable: true })
  storageLimitGb: number | null;

  @Column({ type: 'int', nullable: true })
  studentsLimit: number | null;

  @Column({ type: 'simple-json', nullable: true })
  features: string[] | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
