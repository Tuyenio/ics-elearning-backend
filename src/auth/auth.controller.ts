import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ short: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 login attempts per minute
  @ApiOperation({ summary: 'Đăng nhập hệ thống' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  @ApiResponse({ status: 401, description: 'Sai email hoặc mật khẩu' })
  async login(@Request() req, @Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 3, ttl: 300000 } }) // 3 requests per 5 minutes
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 3, ttl: 60000 } }) // 3 attempts per minute
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@GetUser() user: User) {
    return this.authService.refreshToken(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@GetUser() user: User) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    // Since we're using stateless JWT, logout is handled on the client side
    // by removing the token. But we can add token blacklisting later if needed
    return { message: 'Đã đăng xuất thành công' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @GetUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth login' })
  async googleAuth(@Request() req) {
    // Redirect to Google will be handled by Passport
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthRedirect(@Request() req, @Res() res: Response) {
    try {
      const user = req.user;
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');

      // Kiểm tra status và emailVerified
      if (user.status !== 'active') {
        const errorMessage =
          user.status === 'inactive'
            ? 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ với đội ngũ hỗ trợ để được kích hoạt lại.'
            : 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với đội ngũ hỗ trợ để được kích hoạt lại.';
        const loginUrl = `${frontendUrl}/login?error=account_locked&message=${encodeURIComponent(errorMessage)}`;
        return res.redirect(loginUrl);
      }

      if (!user.emailVerified) {
        const errorMessage = 'Vui lòng xác thực email trước khi đăng nhập';
        const loginUrl = `${frontendUrl}/login?error=email_not_verified&message=${encodeURIComponent(errorMessage)}`;
        return res.redirect(loginUrl);
      }

      const payload = {
        email: user.email,
        sub: user.id,
        role: user.role,
      };

      const access_token = this.authService.generateToken(payload);

      // Chuyển hướng về frontend với token
      const redirectUrl = `${frontendUrl}/auth/google/callback?token=${access_token}&user=${encodeURIComponent(JSON.stringify(user))}`;
      res.redirect(redirectUrl);
    } catch (error) {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      const errorMessage =
        error instanceof Error ? error.message : 'Đăng nhập thất bại';
      const loginUrl = `${frontendUrl}/login?error=auth_failed&message=${encodeURIComponent(errorMessage)}`;
      res.redirect(loginUrl);
    }
  }
}
