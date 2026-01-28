import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { User, UserStatus } from '../users/entities/user.entity';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Vui lòng xác thực email trước khi đăng nhập');
    }

    if (user.status === UserStatus.INACTIVE || user.status === 'inactive') {
      throw new UnauthorizedException('Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ với đội ngũ hỗ trợ để được kích hoạt lại.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với đội ngũ hỗ trợ để được kích hoạt lại.');
    }

    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role 
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        emailVerified: user.emailVerified,
        status: user.status,
      },
    };
  }

  async register(createUserDto: CreateUserDto) {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email đã tồn tại');
    }

    // Create user
    const user = await this.usersService.create(createUserDto);
    
    // Generate verification token
    const verificationToken = this.jwtService.sign(
      { email: user.email, type: 'email-verification' },
      { expiresIn: '24h' }
    );

    // Update user with verification token
    await this.usersService.updateEmailVerificationToken(user.id, verificationToken);

    // Send verification email
    await this.emailService.sendVerificationEmail(user.email, verificationToken);
    
    const { password, emailVerificationToken, passwordResetToken, ...result } = user;
    return {
      message: 'User registered successfully. Please check your email for verification.',
      user: result,
    };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.verifyEmail(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Send welcome email after successful verification
    await this.emailService.sendWelcomeEmail(user.email, user.name);

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(email: string) {
    const resetToken = this.jwtService.sign(
      { email: email, type: 'password-reset' },
      { expiresIn: '1h' }
    );

    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.usersService.updatePasswordResetToken(email, resetToken, expires);

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(email, resetToken);

    return { message: 'If the email exists, a reset link will be sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.resetPassword(token, newPassword);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return { message: 'Password reset successfully' };
  }

  async refreshToken(user: User) {
    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role 
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('Người dùng không tìm thấy');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.usersService.updatePassword(userId, hashedPassword);

    return { message: 'Password changed successfully' };
  }

  generateToken(payload: any) {
    return this.jwtService.sign(payload);
  }
}

