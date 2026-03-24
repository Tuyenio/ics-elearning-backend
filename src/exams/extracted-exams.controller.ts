import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ExtractedExamsService } from './extracted-exams.service';
import { CreateExtractedExamDto } from './dto/create-extracted-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthenticatedRequestUser } from '../common/types/authenticated-request';

@Controller('extracted-exams')
@UseGuards(JwtAuthGuard)
export class ExtractedExamsController {
  constructor(private readonly service: ExtractedExamsService) {}

  @Get('available')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  findAvailableForStudent(@GetUser() user: AuthenticatedRequestUser) {
    return this.service.findAvailableForStudent(user.id);
  }

  @Get('student/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  findOneForStudent(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedRequestUser,
  ) {
    return this.service.findOneForStudent(id, user.id);
  }

  @Post(':id/submit')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  submitForStudent(
    @Param('id') id: string,
    @Body()
    body: {
      variantCode: number | undefined;
      answers: Array<{ questionId: string; answer: string | string[] }>;
    },
    @GetUser() user: AuthenticatedRequestUser,
  ) {
    return this.service.submitForStudent(
      id,
      user.id,
      body?.answers || [],
      body?.variantCode,
    );
  }

  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  findMy(@GetUser() user: AuthenticatedRequestUser) {
    return this.service.findMy(user.id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  create(
    @Body() dto: CreateExtractedExamDto,
    @GetUser() user: AuthenticatedRequestUser,
  ) {
    return this.service.create(dto, user.id, user.role);
  }

  @Get(':id/attempts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getAttempts(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedRequestUser,
  ) {
    return this.service.getAttemptsForTeacher(id, user.id, user.role);
  }

  @Get(':id/attempts/:attemptId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getAttemptDetail(
    @Param('id') id: string,
    @Param('attemptId') attemptId: string,
    @GetUser() user: AuthenticatedRequestUser,
  ) {
    return this.service.getAttemptDetailForTeacher(
      id,
      attemptId,
      user.id,
      user.role,
    );
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  findOne(@Param('id') id: string, @GetUser() user: AuthenticatedRequestUser) {
    return this.service.findOne(id, user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateExtractedExamDto>,
    @GetUser() user: AuthenticatedRequestUser,
  ) {
    return this.service.update(id, user.id, user.role, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  remove(@Param('id') id: string, @GetUser() user: AuthenticatedRequestUser) {
    return this.service.remove(id, user.id);
  }
}
