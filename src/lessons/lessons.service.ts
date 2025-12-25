import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async create(createLessonDto: CreateLessonDto, user: User): Promise<Lesson> {
    const course = await this.courseRepository.findOne({
      where: { id: createLessonDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tìm thấy');
    }

    // Check permissions
    if (user.role !== UserRole.ADMIN && course.teacherId !== user.id) {
      throw new ForbiddenException('Bạn chỉ có thể thêm bài học cho khóa học của bạn');
    }

    // Get the next order number
    if (createLessonDto.order === undefined) {
      const maxOrder = await this.lessonRepository
        .createQueryBuilder('lesson')
        .where('lesson.courseId = :courseId', { courseId: createLessonDto.courseId })
        .select('MAX(lesson.order)', 'max')
        .getRawOne();

      createLessonDto.order = (maxOrder?.max || 0) + 1;
    }

    const lesson = this.lessonRepository.create(createLessonDto);
    return this.lessonRepository.save(lesson);
  }

  async findByCourse(courseId: string): Promise<Lesson[]> {
    return this.lessonRepository.find({
      where: { courseId },
      order: { order: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!lesson) {
      throw new NotFoundException('Bài học không tìm thấy');
    }

    return lesson;
  }

  async update(id: string, updateLessonDto: UpdateLessonDto, user: User): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!lesson) {
      throw new NotFoundException('Bài học không tìm thấy');
    }

    // Check permissions
    if (user.role !== UserRole.ADMIN && lesson.course.teacherId !== user.id) {
      throw new ForbiddenException('Bạn chỉ có thể cập nhật bài học trong khóa học của bạn');
    }

    Object.assign(lesson, updateLessonDto);
    return this.lessonRepository.save(lesson);
  }

  async remove(id: string, user: User): Promise<void> {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!lesson) {
      throw new NotFoundException('Bài học không tìm thấy');
    }

    // Check permissions
    if (user.role !== UserRole.ADMIN && lesson.course.teacherId !== user.id) {
      throw new ForbiddenException('Bạn chỉ có thể xóa bài học khỏi khóa học của bạn');
    }

    await this.lessonRepository.remove(lesson);
  }

  async reorder(courseId: string, lessonIds: string[], user: User): Promise<Lesson[]> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tìm thấy');
    }

    // Check permissions
    if (user.role !== UserRole.ADMIN && course.teacherId !== user.id) {
      throw new ForbiddenException('Bạn chỉ có thể sắp xếp lại bài học trong khóa học của bạn');
    }

    const lessons = await this.lessonRepository.findBy({
      id: In(lessonIds),
      courseId,
    });

    // Update order for each lesson
    const updates = lessonIds.map((id, index) => {
      const lesson = lessons.find((l) => l.id === id);
      if (lesson) {
        lesson.order = index + 1;
        return this.lessonRepository.save(lesson);
      }
      return null;
    });

    await Promise.all(updates.filter(Boolean));

    return this.findByCourse(courseId);
  }
}
