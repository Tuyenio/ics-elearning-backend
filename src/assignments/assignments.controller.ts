import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('assignments')
@ApiBearerAuth()
@Controller('assignments')
@UseGuards(JwtAuthGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Tạo bài tập mới (Teacher/Admin)' })
  create(@Body() createAssignmentDto: CreateAssignmentDto, @Req() req: any) {
    return this.assignmentsService.create(createAssignmentDto, req.user.userId);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Lấy bài tập theo khóa học' })
  findByCourse(@Param('courseId') courseId: string) {
    return this.assignmentsService.findByCourse(courseId);
  }

  @Get('lesson/:lessonId')
  @ApiOperation({ summary: 'Lấy bài tập theo bài học' })
  findByLesson(@Param('lessonId') lessonId: string) {
    return this.assignmentsService.findByLesson(lessonId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết bài tập' })
  findOne(@Param('id') id: string) {
    return this.assignmentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cập nhật bài tập (Teacher/Admin)' })
  update(@Param('id') id: string, @Body() updateAssignmentDto: UpdateAssignmentDto) {
    return this.assignmentsService.update(id, updateAssignmentDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Xóa bài tập (Teacher/Admin)' })
  remove(@Param('id') id: string) {
    return this.assignmentsService.remove(id);
  }

  // Submission endpoints
  @Post(':id/submit')
  @ApiOperation({ summary: 'Nộp bài tập (Student)' })
  submitAssignment(
    @Param('id') id: string,
    @Body() body: { content: string; attachments?: string[] },
    @Req() req: any,
  ) {
    return this.assignmentsService.submitAssignment(
      id,
      body.content,
      body.attachments || [],
      req.user.userId,
    );
  }

  @Get(':id/submissions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách bài nộp (Teacher/Admin)' })
  getSubmissions(@Param('id') id: string) {
    return this.assignmentsService.getSubmissionsByAssignment(id);
  }

  @Get(':id/my-submission')
  @ApiOperation({ summary: 'Lấy bài nộp của tôi' })
  getMySubmission(@Param('id') id: string, @Req() req: any) {
    return this.assignmentsService.getMySubmission(id, req.user.userId);
  }

  @Post('submissions/:submissionId/grade')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Chấm điểm bài nộp (Teacher/Admin)' })
  gradeSubmission(
    @Param('submissionId') submissionId: string,
    @Body() body: { score: number; feedback: string },
    @Req() req: any,
  ) {
    return this.assignmentsService.gradeSubmission(
      submissionId,
      body.score,
      body.feedback,
      req.user.userId,
    );
  }
}
