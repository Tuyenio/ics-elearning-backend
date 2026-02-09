import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationStatus } from './entities/notification.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: NotificationStatus,
  ) {
    return this.notificationsService.findAllByUser(
      req.user.id,
      +page,
      +limit,
      status,
    );
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Post('read-all')
  async markAllAsRead(@Request() req) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { message: 'Đã đánh dấu tất cả đã đọc' };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    await this.notificationsService.delete(id, req.user.id);
    return { message: 'Đã xóa thông báo' };
  }

  @Delete()
  async deleteAll(@Request() req) {
    await this.notificationsService.deleteAll(req.user.id);
    return { message: 'Đã xóa tất cả thông báo' };
  }
}
