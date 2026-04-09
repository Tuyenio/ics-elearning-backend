import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('progress')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('overview')
  getOverview(@GetUser() user: User) {
    return this.progressService.getOverview(user.id);
  }

  @Get('weekly')
  getWeeklyProgress(@GetUser() user: User) {
    return this.progressService.getWeeklyProgress(user.id);
  }

  @Get('courses')
  getAllCourseProgress(@GetUser() user: User) {
    return this.progressService.getAllCourseProgress(user.id);
  }

  @Get('course/:courseId')
  getCourseProgress(
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @GetUser() user: User,
  ) {
    return this.progressService.getCourseProgress(user.id, courseId);
  }

  @Get('achievements')
  getAchievements(@GetUser() user: User) {
    return this.progressService.getAchievements(user.id);
  }
}
