import { Body, Controller, Get, Param, Patch, Post, Delete, Request, UseGuards } from '@nestjs/common';
import { ExtractedExamsService } from './extracted-exams.service';
import { CreateExtractedExamDto } from './dto/create-extracted-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('extracted-exams')
@UseGuards(JwtAuthGuard)
export class ExtractedExamsController {
  constructor(private readonly service: ExtractedExamsService) {}

  @Get('available')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  findAvailableForStudent(@Request() req) {
    return this.service.findAvailableForStudent(req.user.id);
  }

  @Get('student/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  findOneForStudent(@Param('id') id: string, @Request() req) {
    return this.service.findOneForStudent(id, req.user.id);
  }

  @Post(':id/submit')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  submitForStudent(
    @Param('id') id: string,
    @Body() body: { answers: Array<{ questionId: string; answer: string | string[] }>; variantCode?: number },
    @Request() req,
  ) {
    return this.service.submitForStudent(id, req.user.id, body?.answers || [], body?.variantCode);
  }

  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  findMy(@Request() req) {
    return this.service.findMy(req.user.id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  create(@Body() dto: CreateExtractedExamDto, @Request() req) {
    return this.service.create(dto, req.user.id, req.user.role);
  }

  @Get(':id/attempts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getAttempts(@Param('id') id: string, @Request() req) {
    return this.service.getAttemptsForTeacher(id, req.user.id, req.user.role);
  }

  @Get(':id/attempts/:attemptId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getAttemptDetail(
    @Param('id') id: string,
    @Param('attemptId') attemptId: string,
    @Request() req,
  ) {
    return this.service.getAttemptDetailForTeacher(id, attemptId, req.user.id, req.user.role);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  findOne(@Param('id') id: string, @Request() req) {
    return this.service.findOne(id, req.user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateExtractedExamDto>, @Request() req) {
    return this.service.update(id, req.user.id, req.user.role, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  remove(@Param('id') id: string, @Request() req) {
    return this.service.remove(id, req.user.id);
  }
}
