import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Response,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  create(@Body() createNoteDto: CreateNoteDto, @GetUser() user: User) {
    return this.notesService.create(createNoteDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  findAll(@GetUser() user: User) {
    return this.notesService.findByStudent(user.id);
  }

  @Get('my-notes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  findMyNotes(@GetUser() user: User) {
    return this.notesService.findByStudent(user.id);
  }

  @Get('export/excel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  async exportToExcel(@GetUser() user: User, @Response() res: any) {
    try {
      const fileBuffer = await this.notesService.exportToExcel(user.id);
      
      // Set the response headers
      const fileName = `ghi-chu-${new Date().toISOString().split('T')[0]}.xlsx`;
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length,
      });

      res.end(fileBuffer);
    } catch (error) {
      res.status(500).send({ success: false, message: 'Xuất Excel thất bại' });
    }
  }

  @Get(':id/export/excel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  async exportSingleNoteToExcel(@Param('id') id: string, @GetUser() user: User, @Response() res: any) {
    try {
      const fileBuffer = await this.notesService.exportSingleNoteToExcel(id, user.id);
      
      // Set the response headers
      const fileName = `ghi-chu-${new Date().toISOString().split('T')[0]}.xlsx`;
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length,
      });

      res.end(fileBuffer);
    } catch (error) {
      res.status(500).send({ success: false, message: 'Xuất Excel thất bại' });
    }
  }

  @Get('course/:courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  findByCourse(@Param('courseId') courseId: string, @GetUser() user: User) {
    return this.notesService.findByCourse(user.id, courseId);
  }

  @Get('lesson/:lessonId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  findByLesson(@Param('lessonId') lessonId: string, @GetUser() user: User) {
    return this.notesService.findByLesson(user.id, lessonId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.notesService.findOne(id, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  update(@Param('id') id: string, @Body() updateNoteDto: UpdateNoteDto, @GetUser() user: User) {
    return this.notesService.update(id, updateNoteDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.notesService.remove(id, user);
  }
}
