import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { resolveFrontendUrl } from '../../common/utils/frontend-url.util';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private configService: ConfigService) {
    super();
  }

  private getFrontendUrl(): string {
    const rawUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('frontendUrl');

    return resolveFrontendUrl(rawUrl);
  }

  private isGoogleConfigured(): boolean {
    const clientId = this.configService.get<string>('google.clientId')?.trim();
    const clientSecret = this.configService
      .get<string>('google.clientSecret')
      ?.trim();

    return Boolean(clientId && clientSecret);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.isGoogleConfigured()) {
      const response = context.switchToHttp().getResponse();
      const frontendUrl = this.getFrontendUrl();
      const errorMessage =
        'Google OAuth chưa được cấu hình trên server. Vui lòng liên hệ quản trị viên.';
      const errorUrl = `${frontendUrl}/login?error=google_oauth_not_configured&message=${encodeURIComponent(errorMessage)}`;
      response.redirect(errorUrl);
      return true;
    }

    try {
      const result = (await super.canActivate(context)) as boolean;
      return result;
    } catch (error) {
      // Bắt lỗi từ Google strategy và redirect về trang login với thông báo
      const response = context.switchToHttp().getResponse();
      const frontendUrl = this.getFrontendUrl();

      const errorMessage =
        error instanceof Error ? error.message : 'Đăng nhập thất bại';
      const errorUrl = `${frontendUrl}/login?error=auth_failed&message=${encodeURIComponent(errorMessage)}`;

      // Redirect và ngăn NestJS xử lý thêm
      response.redirect(errorUrl);

      // Return true để ngăn exception filter chạy
      return true;
    }
  }
}
