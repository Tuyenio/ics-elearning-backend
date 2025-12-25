import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { TwoFactorAuth, TwoFactorMethod } from './entities/two-factor-auth.entity';
import { User } from '../users/entities/user.entity';

export interface SetupTOTPResult {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface VerifyResult {
  success: boolean;
  message: string;
}

@Injectable()
export class TwoFactorAuthService {
  private readonly logger = new Logger(TwoFactorAuthService.name);
  private readonly appName: string;

  constructor(
    @InjectRepository(TwoFactorAuth)
    private readonly twoFactorAuthRepository: Repository<TwoFactorAuth>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    this.appName = this.configService.get<string>('APP_NAME', 'ICS E-Learning');
  }

  /**
   * Setup TOTP (Time-based One-Time Password) for a user
   */
  async setupTOTP(userId: string): Promise<SetupTOTPResult> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if 2FA already exists
    let twoFactorAuth = await this.twoFactorAuthRepository.findOne({
      where: { user: { id: userId } },
    });

    // Generate new secret
    const secret = speakeasy.generateSecret({
      name: `${this.appName} (${user.email})`,
      length: 20,
    });

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Hash backup codes for storage
    const hashedBackupCodes = backupCodes.map((code) =>
      crypto.createHash('sha256').update(code).digest('hex'),
    );

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');

    if (twoFactorAuth) {
      // Update existing 2FA setup
      twoFactorAuth.secret = secret.base32;
      twoFactorAuth.backupCodes = hashedBackupCodes;
      twoFactorAuth.method = TwoFactorMethod.TOTP;
      twoFactorAuth.isVerified = false;
    } else {
      // Create new 2FA setup
      twoFactorAuth = this.twoFactorAuthRepository.create({
        user,
        secret: secret.base32,
        method: TwoFactorMethod.TOTP,
        backupCodes: hashedBackupCodes,
        isEnabled: false,
        isVerified: false,
      });
    }

    await this.twoFactorAuthRepository.save(twoFactorAuth);

    this.logger.log(`TOTP setup initiated for user: ${userId}`);

    return {
      secret: secret.base32,
      qrCode,
      backupCodes,
    };
  }

  /**
   * Verify TOTP code and enable 2FA
   */
  async verifyAndEnableTOTP(userId: string, token: string): Promise<VerifyResult> {
    const twoFactorAuth = await this.twoFactorAuthRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!twoFactorAuth) {
      throw new BadRequestException('2FA not setup for this user');
    }

    const isValid = speakeasy.totp.verify({
      secret: twoFactorAuth.secret,
      encoding: 'base32',
      token,
      window: 1, // Allow 1 step before/after for clock drift
    });

    if (!isValid) {
      this.logger.warn(`Invalid TOTP code for user: ${userId}`);
      return {
        success: false,
        message: 'Invalid verification code',
      };
    }

    // Enable 2FA
    twoFactorAuth.isEnabled = true;
    twoFactorAuth.isVerified = true;
    twoFactorAuth.lastUsedAt = new Date();
    await this.twoFactorAuthRepository.save(twoFactorAuth);

    this.logger.log(`2FA enabled for user: ${userId}`);

    return {
      success: true,
      message: '2FA has been enabled successfully',
    };
  }

  /**
   * Verify TOTP code during login
   */
  async verifyTOTP(userId: string, token: string): Promise<VerifyResult> {
    const twoFactorAuth = await this.twoFactorAuthRepository.findOne({
      where: { user: { id: userId }, isEnabled: true },
    });

    if (!twoFactorAuth) {
      throw new BadRequestException('2FA not enabled for this user');
    }

    // First try to verify as TOTP
    const isValid = speakeasy.totp.verify({
      secret: twoFactorAuth.secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (isValid) {
      twoFactorAuth.lastUsedAt = new Date();
      await this.twoFactorAuthRepository.save(twoFactorAuth);

      return {
        success: true,
        message: 'Verification successful',
      };
    }

    // If not valid, check if it's a backup code
    const isBackupCode = await this.verifyBackupCode(twoFactorAuth, token);
    if (isBackupCode) {
      return {
        success: true,
        message: 'Backup code used successfully',
      };
    }

    return {
      success: false,
      message: 'Invalid verification code',
    };
  }

  /**
   * Verify backup code
   */
  private async verifyBackupCode(twoFactorAuth: TwoFactorAuth, code: string): Promise<boolean> {
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    const codeIndex = twoFactorAuth.backupCodes.findIndex((bc) => bc === hashedCode);

    if (codeIndex === -1) {
      return false;
    }

    // Remove used backup code
    twoFactorAuth.backupCodes.splice(codeIndex, 1);
    twoFactorAuth.lastUsedAt = new Date();
    await this.twoFactorAuthRepository.save(twoFactorAuth);

    this.logger.log(`Backup code used for user: ${twoFactorAuth.user?.id}`);

    return true;
  }

  /**
   * Disable 2FA for a user
   */
  async disable2FA(userId: string, token: string): Promise<VerifyResult> {
    const result = await this.verifyTOTP(userId, token);
    
    if (!result.success) {
      return result;
    }

    const twoFactorAuth = await this.twoFactorAuthRepository.findOne({
      where: { user: { id: userId } },
    });

    if (twoFactorAuth) {
      twoFactorAuth.isEnabled = false;
      twoFactorAuth.isVerified = false;
      twoFactorAuth.secret = '';
      twoFactorAuth.backupCodes = [];
      await this.twoFactorAuthRepository.save(twoFactorAuth);
    }

    this.logger.log(`2FA disabled for user: ${userId}`);

    return {
      success: true,
      message: '2FA has been disabled',
    };
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(userId: string, token: string): Promise<string[]> {
    const result = await this.verifyTOTP(userId, token);
    
    if (!result.success) {
      throw new BadRequestException('Invalid verification code');
    }

    const twoFactorAuth = await this.twoFactorAuthRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!twoFactorAuth) {
      throw new NotFoundException('Xác thực hai yếu tố không tìm thấy');
    }

    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = backupCodes.map((code) =>
      crypto.createHash('sha256').update(code).digest('hex'),
    );

    twoFactorAuth.backupCodes = hashedBackupCodes;
    await this.twoFactorAuthRepository.save(twoFactorAuth);

    this.logger.log(`Backup codes regenerated for user: ${userId}`);

    return backupCodes;
  }

  /**
   * Check if 2FA is enabled for a user
   */
  async is2FAEnabled(userId: string): Promise<boolean> {
    const twoFactorAuth = await this.twoFactorAuthRepository.findOne({
      where: { user: { id: userId }, isEnabled: true },
    });

    return !!twoFactorAuth;
  }

  /**
   * Get 2FA status for a user
   */
  async get2FAStatus(userId: string): Promise<{
    isEnabled: boolean;
    method: TwoFactorMethod | null;
    backupCodesRemaining: number;
    lastUsedAt: Date | null;
  }> {
    const twoFactorAuth = await this.twoFactorAuthRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      return {
        isEnabled: false,
        method: null,
        backupCodesRemaining: 0,
        lastUsedAt: null,
      };
    }

    return {
      isEnabled: true,
      method: twoFactorAuth.method,
      backupCodesRemaining: twoFactorAuth.backupCodes.length,
      lastUsedAt: twoFactorAuth.lastUsedAt,
    };
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }

    return codes;
  }

  /**
   * Setup SMS-based 2FA
   */
  async setupSMS(userId: string, phoneNumber: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');

    let twoFactorAuth = await this.twoFactorAuthRepository.findOne({
      where: { user: { id: userId } },
    });

    if (twoFactorAuth) {
      twoFactorAuth.secret = hashedCode;
      twoFactorAuth.method = TwoFactorMethod.SMS;
      twoFactorAuth.phoneNumber = phoneNumber;
      twoFactorAuth.isVerified = false;
    } else {
      twoFactorAuth = this.twoFactorAuthRepository.create({
        user,
        secret: hashedCode,
        method: TwoFactorMethod.SMS,
        phoneNumber,
        backupCodes: [],
        isEnabled: false,
        isVerified: false,
      });
    }

    await this.twoFactorAuthRepository.save(twoFactorAuth);

    // TODO: Send SMS with verification code
    // await this.smsService.send(phoneNumber, `Your verification code: ${verificationCode}`);

    this.logger.log(`SMS 2FA setup initiated for user: ${userId}`);

    // For development, return the code (remove in production)
    return {
      message: `Verification code sent to ${phoneNumber}`,
      // code: verificationCode, // Only for testing
    };
  }

  /**
   * Setup Email-based 2FA
   */
  async setupEmail(userId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');

    let twoFactorAuth = await this.twoFactorAuthRepository.findOne({
      where: { user: { id: userId } },
    });

    if (twoFactorAuth) {
      twoFactorAuth.secret = hashedCode;
      twoFactorAuth.method = TwoFactorMethod.EMAIL;
      twoFactorAuth.isVerified = false;
    } else {
      twoFactorAuth = this.twoFactorAuthRepository.create({
        user,
        secret: hashedCode,
        method: TwoFactorMethod.EMAIL,
        backupCodes: [],
        isEnabled: false,
        isVerified: false,
      });
    }

    await this.twoFactorAuthRepository.save(twoFactorAuth);

    // TODO: Send email with verification code
    // await this.emailService.send(user.email, 'Verification Code', `Your code: ${verificationCode}`);

    this.logger.log(`Email 2FA setup initiated for user: ${userId}`);

    return {
      message: `Verification code sent to ${user.email}`,
    };
  }
}
