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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';

@ApiTags('quizzes')
@ApiBearerAuth()
@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Tạo bài kiểm tra mới (Teacher/Admin)' })
  create(@Body() createQuizDto: CreateQuizDto, @GetUser() user: User) {
    return this.quizzesService.create(createQuizDto, user);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Lấy bài kiểm tra theo khóa học' })
  findByCourse(@Param('courseId') courseId: string) {
    return this.quizzesService.findByCourse(courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết bài kiểm tra' })
  findOne(@Param('id') id: string) {
    return this.quizzesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cập nhật bài kiểm tra (Teacher/Admin)' })
  update(
    @Param('id') id: string,
    @Body() updateQuizDto: Partial<CreateQuizDto>,
    @GetUser() user: User,
  ) {
    return this.quizzesService.update(id, updateQuizDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Xóa bài kiểm tra (Teacher/Admin)' })
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.quizzesService.remove(id, user);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Bắt đầu làm bài kiểm tra (Student)' })
  startAttempt(@Param('id') id: string, @GetUser() user: User) {
    return this.quizzesService.startAttempt(id, user);
  }

  @Post('attempts/:attemptId/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Nộp bài kiểm tra (Student)' })
  submitAttempt(
    @Param('attemptId') attemptId: string,
    @Body() submitQuizDto: SubmitQuizDto,
    @GetUser() user: User,
  ) {
    return this.quizzesService.submitAttempt(attemptId, submitQuizDto, user);
  }

  @Get(':id/attempts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Lấy lịch sử làm bài của tôi' })
  getAttempts(@Param('id') id: string, @GetUser() user: User) {
    return this.quizzesService.getAttempts(id, user);
  }

  @Get('attempts/:attemptId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Lấy chi tiết một lần làm bài' })
  getAttempt(@Param('attemptId') attemptId: string, @GetUser() user: User) {
    return this.quizzesService.getAttempt(attemptId, user);
  }
}
