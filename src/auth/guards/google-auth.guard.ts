import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private configService: ConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = (await super.canActivate(context)) as boolean;
      return result;
    } catch (error) {
      // Bắt lỗi từ Google strategy và redirect về trang login với thông báo
      const response = context.switchToHttp().getResponse();
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');

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
