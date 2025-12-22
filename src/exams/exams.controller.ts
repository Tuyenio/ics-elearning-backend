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

@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  // ==================== TEACHER ENDPOINTS ====================

  @Post()
  create(@Body() createExamDto: any, @Request() req) {
    return this.examsService.create(createExamDto, req.user.id);
  }

  @Get('my-exams')
  findMyExams(@Request() req) {
    return this.examsService.findMyExams(req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateExamDto: any, @Request() req) {
    return this.examsService.update(id, updateExamDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.examsService.delete(id, req.user.id);
  }

  @Post(':id/submit-for-approval')
  submitForApproval(@Param('id') id: string, @Request() req) {
    return this.examsService.submitForApproval(id, req.user.id);
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get('admin/all')
  findAll() {
    return this.examsService.findAll();
  }

  @Get('admin/pending')
  findPending() {
    return this.examsService.findPending();
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.examsService.approve(id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.examsService.reject(id, body.reason);
  }

  // ==================== STUDENT ENDPOINTS ====================

  @Get('available')
  findAvailable(@Request() req) {
    return this.examsService.findAvailable(req.user.id);
  }

  @Get('course/:courseId')
  findByCourse(@Param('courseId') courseId: string) {
    return this.examsService.findByCourse(courseId);
  }

  @Post('start')
  startExam(@Body() body: { examId: string }, @Request() req) {
    return this.examsService.startExam(body.examId, req.user.id);
  }

  @Post('submit')
  submitExam(@Body() body: any, @Request() req) {
    return this.examsService.submitExam(body.attemptId, req.user.id, body.answers);
  }

  @Get('my-attempts')
  getMyAttempts(@Request() req) {
    return this.examsService.getMyAttempts(req.user.id);
  }

  @Get('attempt/:attemptId/result')
  getAttemptResult(@Param('attemptId') attemptId: string, @Request() req) {
    return this.examsService.getAttemptResult(attemptId, req.user.id);
  }

  // ==================== PUBLIC ENDPOINTS ====================

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.examsService.findOne(id);
  }
}

