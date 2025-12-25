import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { CoursesService } from '../courses/courses.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly coursesService: CoursesService,
  ) {}

  async create(createReviewDto: CreateReviewDto, student: User): Promise<Review> {
    const course = await this.courseRepository.findOne({
      where: { id: createReviewDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tìm thấy');
    }

    // Check if student is enrolled
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        studentId: student.id,
        courseId: createReviewDto.courseId,
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('Bạn phải đăng ký khóa học để có thể đánh giá');
    }

    // Check if already reviewed
    const existingReview = await this.reviewRepository.findOne({
      where: {
        studentId: student.id,
        courseId: createReviewDto.courseId,
      },
    });

    if (existingReview) {
      throw new ConflictException('Bạn đã đánh giá khóa học này rồi');
    }

    const review = this.reviewRepository.create({
      ...createReviewDto,
      studentId: student.id,
      isVerifiedPurchase: true,
    });

    const savedReview = await this.reviewRepository.save(review);

    // Update course rating
    await this.coursesService.updateRating(createReviewDto.courseId);

    return savedReview;
  }

  async findByCourse(courseId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { courseId, isPublished: true },
      relations: ['student'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByStudent(studentId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { studentId },
      relations: ['course'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ['course', 'student'],
    });

    if (!review) {
      throw new NotFoundException('Đánh giá không tìm thấy');
    }

    return review;
  }

  async update(id: string, updateReviewDto: UpdateReviewDto, user: User): Promise<Review> {
    const review = await this.findOne(id);

    if (review.studentId !== user.id) {
      throw new ForbiddenException('Bạn chỉ có thể cập nhật đánh giá của mình');
    }

    Object.assign(review, updateReviewDto);
    const savedReview = await this.reviewRepository.save(review);

    // Update course rating
    await this.coursesService.updateRating(review.courseId);

    return savedReview;
  }

  async remove(id: string, user: User): Promise<void> {
    const review = await this.findOne(id);

    if (review.studentId !== user.id) {
      throw new ForbiddenException('Bạn chỉ có thể xóa đánh giá của mình');
    }

    const courseId = review.courseId;
    await this.reviewRepository.remove(review);

    // Update course rating
    await this.coursesService.updateRating(courseId);
  }

  async togglePublish(id: string): Promise<Review> {
    const review = await this.findOne(id);
    review.isPublished = !review.isPublished;
    return this.reviewRepository.save(review);
  }

  async incrementHelpfulCount(id: string): Promise<Review> {
    const review = await this.findOne(id);
    review.helpfulCount += 1;
    return this.reviewRepository.save(review);
  }

  async replyToReview(reviewId: string, reply: string, teacherId: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ['course', 'course.teacher'],
    });

    if (!review) {
      throw new NotFoundException('Đánh giá không tìm thấy');
    }

    // Verify that the teacher owns the course
    if (review.course.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn chỉ có thể phản hồi đánh giá của các khóa học của bạn');
    }

    review.teacherReply = reply;
    review.repliedAt = new Date();

    return this.reviewRepository.save(review);
  }
}
