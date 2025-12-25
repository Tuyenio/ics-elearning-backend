import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessonProgress } from './entities/lesson-progress.entity';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { User } from '../users/entities/user.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { EnrollmentsService } from '../enrollments/enrollments.service';

@Injectable()
export class LessonProgressService {
  constructor(
    @InjectRepository(LessonProgress)
    private readonly progressRepository: Repository<LessonProgress>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  async updateProgress(
    lessonId: string,
    enrollmentId: string,
    updateProgressDto: UpdateProgressDto,
    user: User,
  ): Promise<LessonProgress> {
    // Verify enrollment belongs to user
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundException('Đăng ký không tìm thấy');
    }

    if (enrollment.studentId !== user.id) {
      throw new ForbiddenException('Truy cập bị từ chối');
    }

    let progress = await this.progressRepository.findOne({
      where: {
        enrollmentId,
        lessonId,
      },
    });

    if (!progress) {
      // Create if doesn't exist
      progress = this.progressRepository.create({
        enrollmentId,
        lessonId,
      });
    }

    Object.assign(progress, updateProgressDto);

    if (updateProgressDto.isCompleted && !progress.completedAt) {
      progress.completedAt = new Date();
    }

    const savedProgress = await this.progressRepository.save(progress);

    // Update enrollment progress
    await this.enrollmentsService.updateProgress(enrollmentId);

    return savedProgress;
  }

  async getProgress(enrollmentId: string, lessonId: string, user: User): Promise<LessonProgress> {
    // Verify enrollment belongs to user
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundException('Đăng ký không tìm thấy');
    }

    if (enrollment.studentId !== user.id) {
      throw new ForbiddenException('Truy cập bị từ chối');
    }

    const progress = await this.progressRepository.findOne({
      where: {
        enrollmentId,
        lessonId,
      },
      relations: ['lesson'],
    });

    if (!progress) {
      throw new NotFoundException('Tiến độ không tìm thấy');
    }

    return progress;
  }

  async getEnrollmentProgress(enrollmentId: string, user: User): Promise<LessonProgress[]> {
    // Verify enrollment belongs to user
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundException('Đăng ký không tìm thấy');
    }

    if (enrollment.studentId !== user.id) {
      throw new ForbiddenException('Truy cập bị từ chối');
    }

    return this.progressRepository.find({
      where: { enrollmentId },
      relations: ['lesson'],
      order: { lesson: { order: 'ASC' } },
    });
  }
}
