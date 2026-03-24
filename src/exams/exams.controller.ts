import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthenticatedRequestUser } from '../common/types/authenticated-request';

@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  // ==================== TEACHER ENDPOINTS ====================

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  findAllForTeacher(@GetUser() user: AuthenticatedRequestUser) {
    if (user.role === UserRole.ADMIN) {
      return this.examsService.findAll();
    }
    return this.examsService.findMyExams(user.id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  create(
    @Body() createExamDto: CreateExamDto,
    @GetUser() user: AuthenticatedRequestUser,
  ) {
    return this.examsService.create(createExamDto, user.id, user.role);
  }

  @Get('my-exams')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  findMyExams(@GetUser() user: AuthenticatedRequestUser) {
    return this.examsService.findMyExams(user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateExamDto: UpdateExamDto,
    @GetUser() user: AuthenticatedRequestUser,
  ) {
    if (user.role === UserRole.ADMIN) {
      return this.examsService.updateAny(id, updateExamDto);
    }
    return this.examsService.update(id, updateExamDto, user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  remove(@Param('id') id: string, @GetUser() user: AuthenticatedRequestUser) {
    return this.examsService.delete(id, user.id);
  }

  @Post(':id/submit-for-approval')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  submitForApproval(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedRequestUser,
  ) {
    return this.examsService.submitForApproval(id, user.id);
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.examsService.findAll();
  }

  @Get('admin/pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findPending() {
    return this.examsService.findPending();
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  approve(@Param('id') id: string) {
    return this.examsService.approve(id);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  reject(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.examsService.reject(id, body.reason);
  }

  @Delete(':id/admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  adminRemove(@Param('id') id: string) {
    return this.examsService.adminDelete(id);
  }

  // ==================== STUDENT ENDPOINTS ====================

  @Get('available')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  findAvailable(@GetUser() user: AuthenticatedRequestUser) {
    return this.examsService.findAvailable(user.id);
  }

  @Get('course/:courseId')
  findByCourse(@Param('courseId') courseId: string) {
    return this.examsService.findByCourse(courseId);
  }

  @Post('start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  startExam(
    @Body() body: { examId: string },
    @GetUser() user: AuthenticatedRequestUser,
  ) {
    return this.examsService.startExam(body.examId, user.id);
  }

  @Post('submit')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  submitExam(
    @Body() submitExamDto: SubmitExamDto,
    @GetUser() user: AuthenticatedRequestUser,
  ) {
    return this.examsService.submitExam(
      submitExamDto.attemptId,
      user.id,
      submitExamDto.answers,
    );
  }

  @Get('my-attempts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  getMyAttempts(@GetUser() user: AuthenticatedRequestUser) {
    return this.examsService.getMyAttempts(user.id);
  }

  @Get('attempt/:attemptId/result')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  getAttemptResult(
    @Param('attemptId') attemptId: string,
    @GetUser() user: AuthenticatedRequestUser,
  ) {
    return this.examsService.getAttemptResult(attemptId, user.id);
  }

  // ==================== PUBLIC ENDPOINTS ====================

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.examsService.findOne(id);
  }
}
