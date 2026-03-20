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
import { Resource, ResourceType } from '../resources/entities/resource.entity';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
  ) {}

  // Helper to ensure resources is properly formatted
  private formatLesson(lesson: Lesson): Lesson {
    if (lesson && lesson.resources && typeof lesson.resources === 'string') {
      try {
        lesson.resources = JSON.parse(lesson.resources);
      } catch (e) {
        lesson.resources = [];
      }
    }
    return lesson;
  }

  private mapResourcesToLesson(resourceRows: Resource[]): Lesson['resources'] {
    return resourceRows.map((resource) => ({
      name: resource.title,
      url: resource.url,
      type: resource.type,
    }));
  }

  async create(createLessonDto: CreateLessonDto, user: User): Promise<Lesson> {
    const course = await this.courseRepository.findOne({
      where: { id: createLessonDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tìm thấy');
    }

    // Check permissions
    if (user.role !== UserRole.ADMIN && course.teacherId !== user.id) {
      throw new ForbiddenException(
        'Bạn chỉ có thể thêm bài học cho khóa học của bạn',
      );
    }

    // Get the next order number
    if (createLessonDto.order === undefined) {
      const maxOrder = await this.lessonRepository
        .createQueryBuilder('lesson')
        .where('lesson.courseId = :courseId', {
          courseId: createLessonDto.courseId,
        })
        .select('MAX(lesson.order)', 'max')
        .getRawOne();

      createLessonDto.order = (maxOrder?.max || 0) + 1;
    }

    const lesson = this.lessonRepository.create(createLessonDto);
    const saved = await this.lessonRepository.save(lesson);

    if (
      Array.isArray(createLessonDto.resources) &&
      createLessonDto.resources.length
    ) {
      const resourcesToSave = createLessonDto.resources
        .filter((item) => item && item.url)
        .map((item) => {
          const type = item.type as ResourceType;
          return this.resourceRepository.create({
            title: item.name || 'Tai lieu',
            type: type || ResourceType.DOCUMENT,
            url: item.url,
            courseId: saved.courseId,
            lessonId: saved.id,
            uploadedBy: user.id,
            isPublic: false,
          });
        });

      if (resourcesToSave.length) {
        await this.resourceRepository.save(resourcesToSave);
      }
    }

    return this.formatLesson(saved);
  }

  async findByCourse(
    courseId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{
    data: Lesson[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await this.lessonRepository.findAndCount({
      where: { courseId },
      order: { order: 'ASC' },
      skip,
      take: limit,
    });

    const lessonIds = data.map((lesson) => lesson.id);
    const resourceRows = lessonIds.length
      ? await this.resourceRepository.find({
          where: { lessonId: In(lessonIds) },
          order: { createdAt: 'DESC' },
        })
      : [];

    const resourceByLesson = resourceRows.reduce<Record<string, Resource[]>>(
      (acc, resource) => {
        if (!acc[resource.lessonId]) {
          acc[resource.lessonId] = [];
        }
        acc[resource.lessonId].push(resource);
        return acc;
      },
      {},
    );

    return {
      data: data.map((lesson) => {
        const formatted = this.formatLesson(lesson);
        const linkedResources = resourceByLesson[lesson.id];
        if (linkedResources?.length) {
          formatted.resources = this.mapResourcesToLesson(linkedResources);
        }
        return formatted;
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!lesson) {
      throw new NotFoundException('Bài học không tìm thấy');
    }

    const formatted = this.formatLesson(lesson);
    const resourceRows = await this.resourceRepository.find({
      where: { lessonId: id },
      order: { createdAt: 'DESC' },
    });
    if (resourceRows.length) {
      formatted.resources = this.mapResourcesToLesson(resourceRows);
    }
    return formatted;
  }

  async update(
    id: string,
    updateLessonDto: UpdateLessonDto,
    user: User,
  ): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!lesson) {
      throw new NotFoundException('Bài học không tìm thấy');
    }

    // Check permissions
    if (user.role !== UserRole.ADMIN && lesson.course.teacherId !== user.id) {
      throw new ForbiddenException(
        'Bạn chỉ có thể cập nhật bài học trong khóa học của bạn',
      );
    }

    const { resources, ...lessonUpdates } = updateLessonDto;
    Object.assign(lesson, lessonUpdates);
    const updated = await this.lessonRepository.save(lesson);

    if (Array.isArray(resources)) {
      await this.resourceRepository.delete({ lessonId: id });
      const resourcesToSave = resources
        .filter((item) => item && item.url)
        .map((item) => {
          const type = item.type as ResourceType;
          return this.resourceRepository.create({
            title: item.name || 'Tai lieu',
            type: type || ResourceType.DOCUMENT,
            url: item.url,
            courseId: lesson.courseId,
            lessonId: lesson.id,
            uploadedBy: user.id,
            isPublic: false,
          });
        });

      if (resourcesToSave.length) {
        await this.resourceRepository.save(resourcesToSave);
      }
    }

    return this.formatLesson(updated);
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
      throw new ForbiddenException(
        'Bạn chỉ có thể xóa bài học khỏi khóa học của bạn',
      );
    }

    await this.lessonRepository.remove(lesson);
  }

  async togglePublish(id: string, user: User): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!lesson) {
      throw new NotFoundException('Bài học không tìm thấy');
    }

    if (user.role !== UserRole.ADMIN && lesson.course.teacherId !== user.id) {
      throw new ForbiddenException(
        'Bạn chỉ có thể cập nhật bài học trong khóa học của bạn',
      );
    }

    lesson.isPublished = !lesson.isPublished;
    const saved = await this.lessonRepository.save(lesson);
    return this.formatLesson(saved);
  }

  async reorder(
    courseId: string,
    lessonIds: string[],
    user: User,
  ): Promise<{
    data: Lesson[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tìm thấy');
    }

    // Check permissions
    if (user.role !== UserRole.ADMIN && course.teacherId !== user.id) {
      throw new ForbiddenException(
        'Bạn chỉ có thể sắp xếp lại bài học trong khóa học của bạn',
      );
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
