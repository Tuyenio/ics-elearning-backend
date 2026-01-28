import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    this.createTransporter();
  }

  private createTransporter() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;

    const mailOptions = {
      from: this.configService.get('SMTP_FROM'),
      to: email,
      subject: 'Verify your email address - ICS Learning',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${this.configService.get('FRONTEND_URL')}/image/logo-ics.jpg" alt="ICS Cyber Security" style="height: 60px; border-radius: 50%;">
          </div>
          
          <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Verify Your Email Address</h1>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Thank you for registering with ICS Learning! To complete your registration, please verify your email address by clicking the button below:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            If you can't click the button above, copy and paste this link into your browser:
          </p>
          <p style="color: #007bff; word-break: break-all; font-size: 14px;">
            ${verificationUrl}
          </p>
          
          <hr style="border: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            This verification link will expire in 24 hours. If you didn't create an account, please ignore this email.
          </p>
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} ICS Learning. All rights reserved.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;

    const mailOptions = {
      from: this.configService.get('SMTP_FROM'),
      to: email,
      subject: 'Reset your password - ICS Learning',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${this.configService.get('FRONTEND_URL')}/image/logo-ics.jpg" alt="ICS Cyber Security" style="height: 60px; border-radius: 50%;">
          </div>
          
          <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Reset Your Password</h1>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            We received a request to reset your password for your ICS Learning account. Click the button below to create a new password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            If you can't click the button above, copy and paste this link into your browser:
          </p>
          <p style="color: #dc3545; word-break: break-all; font-size: 14px;">
            ${resetUrl}
          </p>
          
          <hr style="border: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
          </p>
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} ICS Learning. All rights reserved.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, firstName: string) {
    const dashboardUrl = `${this.configService.get('FRONTEND_URL')}/dashboard`;

    const mailOptions = {
      from: this.configService.get('SMTP_FROM'),
      to: email,
      subject: 'Welcome to ICS Learning!',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://i.imgur.com/VtxQWJx.png" alt="ICS Cyber Security" style="height: 60px;">
          </div>
          
          <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Welcome to ICS Learning!</h1>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Hi ${firstName},
          </p>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Welcome to ICS Learning! Your account has been successfully verified and you're ready to start your learning journey.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" 
               style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Here's what you can do next:
          </p>
          
          <ul style="color: #666; font-size: 16px; line-height: 1.8; padding-left: 20px;">
            <li>Browse our course catalog</li>
            <li>Complete your profile</li>
            <li>Start learning with our interactive courses</li>
            <li>Join our community of learners</li>
          </ul>
          
          <hr style="border: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #666; font-size: 14px; text-align: center;">
            Need help? Contact our support team or visit our help center.
          </p>
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} ICS Learning. All rights reserved.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
      throw error;
    }
  }

  async sendAdminCreatedUserEmail(email: string, name: string, tempPassword: string) {
    const loginUrl = `${this.configService.get('FRONTEND_URL')}/login`;

    const mailOptions = {
      from: this.configService.get('SMTP_FROM'),
      to: email,
      subject: 'Your ICS Learning Account Has Been Created',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://i.imgur.com/VtxQWJx.png" alt="ICS Cyber Security" style="height: 60px;">
          </div>
          
          <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Chào mừng bạn đến với ICS Learning!</h1>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Xin chào <strong>${name}</strong>,
          </p>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Quản trị viên đã tạo tài khoản ICS Learning cho bạn. Tài khoản của bạn đã được kích hoạt và sẵn sàng sử dụng!
          </p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
            <h3 style="color: #007bff; margin-top: 0;">📧 Thông tin đăng nhập của bạn:</h3>
            <p style="color: #333; margin: 10px 0; font-size: 15px;"><strong>Email:</strong> ${email}</p>
            <p style="color: #333; margin: 10px 0; font-size: 15px;"><strong>Mật khẩu tạm thời:</strong> <code style="background: #e3f2fd; padding: 5px 10px; border-radius: 4px; font-family: monospace;">${tempPassword}</code></p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="color: #856404; font-size: 14px; line-height: 1.5; margin: 0;">
              <strong>⚠️ Lưu ý quan trọng:</strong> Vui lòng đổi mật khẩu ngay sau lần đăng nhập đầu tiên để bảo mật tài khoản của bạn.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background-color: #007bff; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
              🚀 Đăng nhập ngay
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            Sau khi đăng nhập, bạn có thể:
          </p>
          <ul style="color: #666; font-size: 14px; line-height: 1.8;">
            <li>✅ Thay đổi mật khẩu trong phần "Hồ sơ cá nhân"</li>
            <li>✅ Cập nhật thông tin cá nhân</li>
            <li>✅ Bắt đầu học các khóa học</li>
          </ul>
          
          <hr style="border: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            Nếu bạn gặp vấn đề gì, vui lòng liên hệ với quản trị viên hoặc đội ngũ hỗ trợ của chúng tôi.
          </p>
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} ICS Learning. All rights reserved.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Admin-created user email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send admin-created user email to ${email}:`, error);
      throw error;
    }
  }
}