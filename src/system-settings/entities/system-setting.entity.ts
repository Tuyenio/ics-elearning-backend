import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('system_settings', { schema: 'learning' })
export class SystemSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  key: string;

  @Column('text', { nullable: true })
  value: string;

  @Column({ nullable: true })
  site_logo?: string;
}
