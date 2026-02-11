import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment, EnrollmentStatus } from './entities/enrollment.entity';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { User } from '../users/entities/user.entity';
import { Course, CourseStatus } from '../courses/entities/course.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import { LessonProgress } from '../lesson-progress/entities/lesson-progress.entity';
import { CoursesService } from '../courses/courses.service';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepository: Repository<LessonProgress>,
    private readonly coursesService: CoursesService,
  ) {}

  async create(
    createEnrollmentDto: CreateEnrollmentDto,
    student: User,
  ): Promise<Enrollment> {
    const course = await this.courseRepository.findOne({
      where: { id: createEnrollmentDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tìm thấy');
    }

    // ✅ Check course status
    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException(
        'Khóa học chưa được công bố hoặc không còn khả dụng',
      );
    }

    // ✅ Check if paid course
    const finalPrice = course.discountPrice || course.price || 0;
    if (finalPrice > 0) {
      throw new BadRequestException(
        'Khóa học có phí, vui lòng thanh toán trước khi đăng ký',
      );
    }

    // Check if already enrolled
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: {
        studentId: student.id,
        courseId: createEnrollmentDto.courseId,
      },
    });

    if (existingEnrollment) {
      throw new ConflictException('Đã đăng ký khóa học này rồi');
    }

    const enrollment = this.enrollmentRepository.create({
      studentId: student.id,
      courseId: createEnrollmentDto.courseId,
      status: EnrollmentStatus.ACTIVE,
    });

    const savedEnrollment = await this.enrollmentRepository.save(enrollment);

    // Create lesson progress entries for all lessons
    const lessons = await this.lessonRepository.find({
      where: { courseId: course.id },
    });

    const progressEntries = lessons.map((lesson) =>
      this.lessonProgressRepository.create({
        enrollmentId: savedEnrollment.id,
        lessonId: lesson.id,
      }),
    );

    if (progressEntries.length > 0) {
      await this.lessonProgressRepository.save(progressEntries);
    }

    // Increment enrollment count for the course
    await this.coursesService.incrementEnrollmentCount(course.id);

    return savedEnrollment;
  }

  async findByStudent(
    studentId: string,
    options?: { page?: number; limit?: number; status?: string },
  ): Promise<{
    data: Enrollment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { studentId };
    if (options?.status) {
      where.status = options.status;
    }

    const [data, total] = await this.enrollmentRepository.findAndCount({
      where,
      relations: ['course', 'course.teacher', 'course.category'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId: string): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
      relations: [
        'course',
        'student',
        'lessonProgress',
        'lessonProgress.lesson',
      ],
    });

    if (!enrollment) {
      throw new NotFoundException('Đăng ký không tìm thấy');
    }

    // Students can only view their own enrollments
    if (enrollment.studentId !== userId) {
      throw new ForbiddenException('Truy cập bị từ chối');
    }

    return enrollment;
  }

  async findByStudentAndCourse(
    studentId: string,
    courseId: string,
  ): Promise<Enrollment | null> {
    return this.enrollmentRepository.findOne({
      where: { studentId, courseId },
      relations: ['lessonProgress', 'lessonProgress.lesson'],
    });
  }

  async updateProgress(enrollmentId: string): Promise<void> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['lessonProgress', 'course', 'course.lessons'],
    });

    if (!enrollment) return;

    const totalLessons = enrollment.course.lessons.length;
    if (totalLessons === 0) return;

    const completedLessons = enrollment.lessonProgress.filter(
      (lp) => lp.isCompleted,
    ).length;
    const progress = (completedLessons / totalLessons) * 100;

    enrollment.progress = progress;
    enrollment.lastAccessedAt = new Date();

    // Mark as completed if all lessons are done
    if (progress >= 100 && enrollment.status === EnrollmentStatus.ACTIVE) {
      enrollment.status = EnrollmentStatus.COMPLETED;
      enrollment.completedAt = new Date();
    }

    await this.enrollmentRepository.save(enrollment);
  }

  async update(
    id: string,
    updateEnrollmentDto: UpdateEnrollmentDto,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
    });

    if (!enrollment) {
      throw new NotFoundException('Đăng ký không tìm thấy');
    }

    Object.assign(enrollment, updateEnrollmentDto);
    return this.enrollmentRepository.save(enrollment);
  }

  async remove(id: string): Promise<void> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
    });

    if (!enrollment) {
      throw new NotFoundException('Đăng ký khoá học không tìm thấy');
    }

    await this.enrollmentRepository.remove(enrollment);
  }
}
