import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Lesson, LessonResourceItem } from './entities/lesson.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Resource, ResourceType } from '../resources/entities/resource.entity';

type ResourceInput = {
  name?: unknown;
  url?: unknown;
  type?: unknown;
};

type MaxOrderRow = { max: number | string | null };

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

  private isResourceInput(item: unknown): item is ResourceInput {
    return typeof item === 'object' && item !== null;
  }

  private toResourceType(value: unknown): ResourceType {
    if (typeof value !== 'string') {
      return ResourceType.DOCUMENT;
    }

    const normalized = value.trim().toLowerCase();
    const isValidType = (Object.values(ResourceType) as string[]).includes(
      normalized,
    );

    return isValidType ? (normalized as ResourceType) : ResourceType.DOCUMENT;
  }

  private normalizeResourceList(input: unknown): LessonResourceItem[] {
    if (!input) return [];

    const items =
      typeof input === 'string'
        ? (() => {
            try {
              return JSON.parse(input) as unknown;
            } catch {
              return [] as unknown[];
            }
          })()
        : input;

    if (!Array.isArray(items)) return [];

    return items
      .filter((item): item is ResourceInput => this.isResourceInput(item))
      .map((item) => ({
        name: typeof item.name === 'string' ? item.name : 'Tai lieu',
        url: typeof item.url === 'string' ? item.url : '',
        type: this.toResourceType(item.type),
      }))
      .filter((item) => !!item.url);
  }

  // Helper to ensure resources is properly formatted
  private formatLesson(lesson: Lesson): Lesson {
    const normalizedResources = this.normalizeResourceList(lesson.resources);
    lesson.resources = [...normalizedResources];
    return lesson;
  }

  private mapResourcesToLesson(resourceRows: Resource[]): LessonResourceItem[] {
    return resourceRows.map((resource) => ({
      name: resource.title,
      url: resource.url,
      type: resource.type,
    }));
  }

  private async resolveEditableCourse(courseId: string, user: User): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tìm thấy');
    }

    if (user.role !== UserRole.ADMIN && course.teacherId !== user.id) {
      throw new ForbiddenException(
        'Bạn chỉ có thể chỉnh sửa bài học trong khóa học của bạn',
      );
    }

    return course;
  }

  private async resolveEditableLesson(id: string, user: User): Promise<Lesson> {
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

    return lesson;
  }

  async create(createLessonDto: CreateLessonDto, user: User): Promise<Lesson> {
    const editableCourse = await this.resolveEditableCourse(
      createLessonDto.courseId,
      user,
    );
    createLessonDto.courseId = editableCourse.id;

    // Get the next order number
    if (createLessonDto.order === undefined) {
      const maxOrder = await this.lessonRepository
        .createQueryBuilder('lesson')
        .where('lesson.courseId = :courseId', {
          courseId: createLessonDto.courseId,
        })
        .select('MAX(lesson.order)', 'max')
        .getRawOne<MaxOrderRow>();

      const maxOrderValue =
        typeof maxOrder?.max === 'number'
          ? maxOrder.max
          : Number(maxOrder?.max ?? 0);
      createLessonDto.order =
        (Number.isFinite(maxOrderValue) ? maxOrderValue : 0) + 1;
    }

    const lesson = this.lessonRepository.create(createLessonDto);
    const saved = await this.lessonRepository.save(lesson);

    const normalizedResources = this.normalizeResourceList(
      createLessonDto.resources,
    );

    if (normalizedResources.length) {
      const resourcesToSave = normalizedResources.map((item) =>
        this.resourceRepository.create({
          title: item.name || 'Tai lieu',
          type: this.toResourceType(item.type),
          url: item.url,
          courseId: saved.courseId,
          lessonId: saved.id,
          uploadedBy: user.id,
          isPublic: false,
        }),
      );

      await this.resourceRepository.save(resourcesToSave);
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
    const lesson = await this.resolveEditableLesson(id, user);

    const { resources, ...lessonUpdates } = updateLessonDto;
    Object.assign(lesson, lessonUpdates);
    const updated = await this.lessonRepository.save(lesson);

    if (Array.isArray(resources)) {
      await this.resourceRepository.delete({ lessonId: lesson.id });
      const normalizedResources = this.normalizeResourceList(resources);

      if (normalizedResources.length) {
        const resourcesToSave = normalizedResources.map((item) =>
          this.resourceRepository.create({
            title: item.name || 'Tai lieu',
            type: this.toResourceType(item.type),
            url: item.url,
            courseId: lesson.courseId,
            lessonId: lesson.id,
            uploadedBy: user.id,
            isPublic: false,
          }),
        );

        await this.resourceRepository.save(resourcesToSave);
      }
    }

    return this.formatLesson(updated);
  }

  async remove(id: string, user: User): Promise<void> {
    const lesson = await this.resolveEditableLesson(id, user);

    await this.lessonRepository.remove(lesson);
  }

  async togglePublish(id: string, user: User): Promise<Lesson> {
    const lesson = await this.resolveEditableLesson(id, user);

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
    const editableCourse = await this.resolveEditableCourse(courseId, user);

    const lessons = await this.lessonRepository.findBy({
      id: In(lessonIds),
      courseId: editableCourse.id,
    });

    // Update order for each lesson
    const updates: Array<Promise<Lesson> | null> = lessonIds.map(
      (id, index) => {
        const lesson = lessons.find((l) => l.id === id);
        if (lesson) {
          lesson.order = index + 1;
          return this.lessonRepository.save(lesson);
        }
        return null;
      },
    );

    await Promise.all(
      updates.filter((item): item is Promise<Lesson> => item !== null),
    );

    return this.findByCourse(editableCourse.id);
  }
}
