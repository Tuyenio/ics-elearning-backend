import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment, EnrollmentStatus } from './entities/enrollment.entity';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import { LessonProgress } from '../lesson-progress/entities/lesson-progress.entity';

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
  ) {}

  async create(createEnrollmentDto: CreateEnrollmentDto, student: User): Promise<Enrollment> {
    const course = await this.courseRepository.findOne({
      where: { id: createEnrollmentDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tìm thấy');
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

    return savedEnrollment;
  }

  async findByStudent(studentId: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { studentId },
      relations: ['course', 'course.teacher', 'course.category'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
      relations: ['course', 'student', 'lessonProgress', 'lessonProgress.lesson'],
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

  async findByStudentAndCourse(studentId: string, courseId: string): Promise<Enrollment | null> {
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

    const completedLessons = enrollment.lessonProgress.filter((lp) => lp.isCompleted).length;
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

  async update(id: string, updateEnrollmentDto: UpdateEnrollmentDto): Promise<Enrollment> {
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
