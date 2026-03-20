import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ExtractedExamsService } from './extracted-exams.service';
import { CreateExtractedExamDto } from './dto/create-extracted-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

type AuthenticatedRequest = ExpressRequest & {
  user: {
    id: string;
    role: UserRole;
  };
};

@Controller('extracted-exams')
@UseGuards(JwtAuthGuard)
export class ExtractedExamsController {
  constructor(private readonly service: ExtractedExamsService) {}

  @Get('available')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  findAvailableForStudent(@Request() req: AuthenticatedRequest) {
    return this.service.findAvailableForStudent(req.user.id);
  }

  @Get('student/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  findOneForStudent(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.findOneForStudent(id, req.user.id);
  }

  @Post(':id/submit')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  submitForStudent(
    @Param('id') id: string,
    @Body()
    body: { answers: Array<{ questionId: string; answer: string | string[] }> },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.submitForStudent(id, req.user.id, body?.answers || []);
  }

  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  findMy(@Request() req: AuthenticatedRequest) {
    return this.service.findMy(req.user.id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  create(
    @Body() dto: CreateExtractedExamDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.create(dto, req.user.id, req.user.role);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.findOne(id, req.user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateExtractedExamDto>,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.update(id, req.user.id, req.user.role, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.remove(id, req.user.id);
  }
}
