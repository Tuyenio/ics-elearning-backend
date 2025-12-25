import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './entities/note.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
  ) {}

  async create(createNoteDto: CreateNoteDto, student: User): Promise<Note> {
    const note = this.noteRepository.create({
      ...createNoteDto,
      studentId: student.id,
    });

    return this.noteRepository.save(note);
  }

  async findByStudent(studentId: string): Promise<Note[]> {
    return this.noteRepository.find({
      where: { studentId },
      relations: ['course', 'lesson'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCourse(studentId: string, courseId: string): Promise<Note[]> {
    return this.noteRepository.find({
      where: { studentId, courseId },
      relations: ['lesson'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByLesson(studentId: string, lessonId: string): Promise<Note[]> {
    return this.noteRepository.find({
      where: { studentId, lessonId },
      order: { timestamp: 'ASC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Note> {
    const note = await this.noteRepository.findOne({
      where: { id },
      relations: ['course', 'lesson'],
    });

    if (!note) {
      throw new NotFoundException('Ghi chú không tìm thấy');
    }

    if (note.studentId !== userId) {
      throw new ForbiddenException('Truy cập bị từ chối');
    }

    return note;
  }

  async update(id: string, updateNoteDto: UpdateNoteDto, user: User): Promise<Note> {
    const note = await this.findOne(id, user.id);

    Object.assign(note, updateNoteDto);
    return this.noteRepository.save(note);
  }

  async remove(id: string, user: User): Promise<void> {
    const note = await this.findOne(id, user.id);
    await this.noteRepository.remove(note);
  }
}
