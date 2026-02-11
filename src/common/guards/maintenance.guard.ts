import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { SystemSettingsService } from '../../system-settings/system-setting.service';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly systemSettingsService: SystemSettingsService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path || request.url || '';

    // Chỉ kiểm tra các route API
    if (!path.startsWith('/api')) {
      return true;
    }

    const maintenanceMode =
      await this.systemSettingsService.isMaintenanceMode();
    if (!maintenanceMode) {
      return true;
    }

    // Cho phép các endpoint cần thiết để admin tắt bảo trì hoặc user đăng xuất
    const allowList = [
      '/api/system-settings',
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/refresh',
    ];
    if (allowList.some((prefix) => path.startsWith(prefix))) {
      return true;
    }

    const authHeader = request.headers.authorization;
    const token = authHeader?.split(' ')[1];
    const payload = token ? this.jwtService.decode(token) : null;
    const role = payload?.role;

    if (role === 'admin') {
      return true;
    }

    throw new ServiceUnavailableException(
      'Hệ thống đang bảo trì. Vui lòng quay lại sau.',
    );
  }
}
