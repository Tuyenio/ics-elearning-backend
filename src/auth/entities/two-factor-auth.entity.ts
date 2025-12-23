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

export enum TwoFactorMethod {
  TOTP = 'totp', // Time-based One-Time Password (Google Authenticator)
  SMS = 'sms',
  EMAIL = 'email',
}

@Entity('two_factor_auth')
export class TwoFactorAuth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ unique: true })
  userId: string;

  @Column({ default: false })
  isEnabled: boolean;

  @Column({
    type: 'enum',
    enum: TwoFactorMethod,
    default: TwoFactorMethod.TOTP,
  })
  method: TwoFactorMethod;

  @Column({ nullable: true })
  secret: string; // TOTP secret key (encrypted)

  @Column({ type: 'simple-array', nullable: true })
  backupCodes: string[]; // Encrypted backup codes

  @Column({ nullable: true })
  phoneNumber: string; // For SMS 2FA

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
