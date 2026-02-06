import { Controller, Get, UseGuards, Req, Res, Post, Body, Param } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import type { Response } from 'express';

@Controller('teacher')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('dashboard/stats')
  getDashboardStats(@Req() req: any) {
    return this.teacherService.getDashboardStats(req.user.userId);
  }

  @Get('dashboard/enrollments/recent')
  getRecentEnrollments(@Req() req: any) {
    return this.teacherService.getRecentEnrollments(req.user.userId);
  }

  @Get('earnings')
  getEarnings(@Req() req: any) {
    return this.teacherService.getEarnings(req.user.userId);
  }

  @Get('students')
  getStudents(@Req() req: any) {
    return this.teacherService.getStudentList(req.user.userId);
  }

  @Post('students/export')
  async exportStudents(@Req() req: any, @Res() res: Response) {
    const csv = await this.teacherService.exportStudentsToCSV(req.user.userId);
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="students.csv"');
    res.send(csv);
  }

  @Post('earnings/export')
  async exportEarnings(@Req() req: any, @Res() res: Response) {
    const csv = await this.teacherService.exportEarningsToCSV(req.user.userId);
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="earnings.csv"');
    res.send(csv);
  }

  @Get('reviews')
  getReviews(@Req() req: any) {
    return this.teacherService.getTeacherReviews(req.user.userId);
  }

  @Post('reviews/:id/reply')
  replyReview(@Req() req: any, @Param('id') id: string, @Body('reply') reply: string) {
    return this.teacherService.replyToReview(req.user.userId, id, reply);
  }
}
