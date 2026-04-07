import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';

@Entity('admin_audit_logs', { schema: 'learning' })
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  action: string;

  @Column()
  @Index()
  entityType: string;

  @Column({ nullable: true })
  @Index()
  entityId?: string | null;

  @Column({ nullable: true })
  @Index()
  actorId?: string | null;

  @Column({ nullable: true })
  actorEmail?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;
}
