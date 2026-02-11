import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { LessonProgressService } from './lesson-progress.service';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';

@Controller('lesson-progress')
export class LessonProgressController {
  constructor(private readonly lessonProgressService: LessonProgressService) {}

  @Patch(':enrollmentId/:lessonId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  updateProgress(
    @Param('enrollmentId') enrollmentId: string,
    @Param('lessonId') lessonId: string,
    @Body() updateProgressDto: UpdateProgressDto,
    @GetUser() user: User,
  ) {
    return this.lessonProgressService.updateProgress(
      lessonId,
      enrollmentId,
      updateProgressDto,
      user,
    );
  }

  @Get(':enrollmentId/:lessonId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  getProgress(
    @Param('enrollmentId') enrollmentId: string,
    @Param('lessonId') lessonId: string,
    @GetUser() user: User,
  ) {
    return this.lessonProgressService.getProgress(enrollmentId, lessonId, user);
  }

  @Get('enrollment/:enrollmentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  getEnrollmentProgress(
    @Param('enrollmentId') enrollmentId: string,
    @GetUser() user: User,
  ) {
    return this.lessonProgressService.getEnrollmentProgress(enrollmentId, user);
  }
}
