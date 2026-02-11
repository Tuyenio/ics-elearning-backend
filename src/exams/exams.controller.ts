import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  // ==================== TEACHER ENDPOINTS ====================

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  create(@Body() createExamDto: CreateExamDto, @Request() req) {
    return this.examsService.create(createExamDto, req.user.id);
  }

  @Get('my-exams')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  findMyExams(@Request() req) {
    return this.examsService.findMyExams(req.user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateExamDto: UpdateExamDto,
    @Request() req,
  ) {
    return this.examsService.update(id, updateExamDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  remove(@Param('id') id: string, @Request() req) {
    return this.examsService.delete(id, req.user.id);
  }

  @Post(':id/submit-for-approval')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  submitForApproval(@Param('id') id: string, @Request() req) {
    return this.examsService.submitForApproval(id, req.user.id);
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

  // ==================== STUDENT ENDPOINTS ====================

  @Get('available')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  findAvailable(@Request() req) {
    return this.examsService.findAvailable(req.user.id);
  }

  @Get('course/:courseId')
  findByCourse(@Param('courseId') courseId: string) {
    return this.examsService.findByCourse(courseId);
  }

  @Post('start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  startExam(@Body() body: { examId: string }, @Request() req) {
    return this.examsService.startExam(body.examId, req.user.id);
  }

  @Post('submit')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  submitExam(@Body() submitExamDto: SubmitExamDto, @Request() req) {
    return this.examsService.submitExam(
      submitExamDto.attemptId,
      req.user.id,
      submitExamDto.answers,
    );
  }

  @Get('my-attempts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  getMyAttempts(@Request() req) {
    return this.examsService.getMyAttempts(req.user.id);
  }

  @Get('attempt/:attemptId/result')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  getAttemptResult(@Param('attemptId') attemptId: string, @Request() req) {
    return this.examsService.getAttemptResult(attemptId, req.user.id);
  }

  // ==================== PUBLIC ENDPOINTS ====================

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.examsService.findOne(id);
  }
}
