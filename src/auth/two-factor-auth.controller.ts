import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

class SetupTOTPDto {}

class VerifyTOTPDto {
  token: string;
}

class SetupSMSDto {
  phoneNumber: string;
}

class DisableDto {
  token: string;
}

@Controller('auth/2fa')
@UseGuards(JwtAuthGuard)
export class TwoFactorAuthController {
  constructor(private readonly twoFactorAuthService: TwoFactorAuthService) {}

  /**
   * Get 2FA status for current user
   */
  @Get('status')
  async getStatus(@Request() req) {
    return this.twoFactorAuthService.get2FAStatus(req.user.userId);
  }

  /**
   * Check if 2FA is enabled
   */
  @Get('enabled')
  async isEnabled(@Request() req) {
    const isEnabled = await this.twoFactorAuthService.is2FAEnabled(req.user.userId);
    return { isEnabled };
  }

  /**
   * Setup TOTP (Google Authenticator)
   */
  @Post('setup/totp')
  async setupTOTP(@Request() req) {
    return this.twoFactorAuthService.setupTOTP(req.user.userId);
  }

  /**
   * Verify TOTP and enable 2FA
   */
  @Post('verify/totp')
  @HttpCode(HttpStatus.OK)
  async verifyTOTP(@Request() req, @Body() body: VerifyTOTPDto) {
    return this.twoFactorAuthService.verifyAndEnableTOTP(req.user.userId, body.token);
  }

  /**
   * Verify 2FA during login
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Request() req, @Body() body: VerifyTOTPDto) {
    return this.twoFactorAuthService.verifyTOTP(req.user.userId, body.token);
  }

  /**
   * Disable 2FA
   */
  @Post('disable')
  @HttpCode(HttpStatus.OK)
  async disable(@Request() req, @Body() body: DisableDto) {
    return this.twoFactorAuthService.disable2FA(req.user.userId, body.token);
  }

  /**
   * Regenerate backup codes
   */
  @Post('backup-codes/regenerate')
  async regenerateBackupCodes(@Request() req, @Body() body: VerifyTOTPDto) {
    const codes = await this.twoFactorAuthService.regenerateBackupCodes(
      req.user.userId,
      body.token,
    );
    return { backupCodes: codes };
  }

  /**
   * Setup SMS 2FA
   */
  @Post('setup/sms')
  async setupSMS(@Request() req, @Body() body: SetupSMSDto) {
    return this.twoFactorAuthService.setupSMS(req.user.userId, body.phoneNumber);
  }

  /**
   * Setup Email 2FA
   */
  @Post('setup/email')
  async setupEmail(@Request() req) {
    return this.twoFactorAuthService.setupEmail(req.user.userId);
  }
}
