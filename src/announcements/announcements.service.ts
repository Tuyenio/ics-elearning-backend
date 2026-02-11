import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { Announcement } from './entities/announcement.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepository: Repository<Announcement>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async create(
    createAnnouncementDto: CreateAnnouncementDto,
    user: User,
  ): Promise<Announcement> {
    // Validate course if courseId provided
    if (createAnnouncementDto.courseId) {
      const course = await this.courseRepository.findOne({
        where: { id: createAnnouncementDto.courseId },
      });

      if (!course) {
        throw new NotFoundException('Khóa học không tìm thấy');
      }

      // Only course teacher or admin can create announcements for a course
      if (user.role === UserRole.TEACHER && course.teacherId !== user.id) {
        throw new ForbiddenException(
          'Bạn chỉ có thể tạo thông báo cho các khóa học của bạn',
        );
      }
    }

    const announcement = this.announcementRepository.create({
      ...createAnnouncementDto,
      authorId: user.id,
    });

    return this.announcementRepository.save(announcement);
  }

  async findAll(courseId?: string): Promise<Announcement[]> {
    const queryBuilder = this.announcementRepository
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.author', 'author')
      .leftJoinAndSelect('announcement.course', 'course')
      .where('announcement.isPublished = :isPublished', { isPublished: true });

    if (courseId) {
      queryBuilder.andWhere('announcement.courseId = :courseId', { courseId });
    }

    return queryBuilder
      .orderBy('announcement.isPinned', 'DESC')
      .addOrderBy('announcement.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<Announcement> {
    const announcement = await this.announcementRepository.findOne({
      where: { id },
      relations: ['author', 'course'],
    });

    if (!announcement) {
      throw new NotFoundException('Thông báo không tìm thấy');
    }

    return announcement;
  }

  async update(
    id: string,
    updateAnnouncementDto: UpdateAnnouncementDto,
    user: User,
  ): Promise<Announcement> {
    const announcement = await this.findOne(id);

    // Only author or admin can update
    if (user.role !== UserRole.ADMIN && announcement.authorId !== user.id) {
      throw new ForbiddenException('Bạn chỉ có thể cập nhật thông báo của bạn');
    }

    Object.assign(announcement, updateAnnouncementDto);
    return this.announcementRepository.save(announcement);
  }

  async remove(id: string, user: User): Promise<void> {
    const announcement = await this.findOne(id);

    // Only author or admin can delete
    if (user.role !== UserRole.ADMIN && announcement.authorId !== user.id) {
      throw new ForbiddenException('Bạn chỉ có thể xoá thông báo của bạn');
    }

    await this.announcementRepository.remove(announcement);
  }
}
