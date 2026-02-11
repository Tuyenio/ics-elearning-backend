import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Course, CourseStatus } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Review } from '../reviews/entities/review.entity';
import { Category } from '../categories/entities/category.entity';
import {
  PublicStats,
  CategoryStat,
  FeaturedCourse,
} from './dto/public-stats.dto';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async getPublicStats(): Promise<PublicStats> {
    const [
      totalStudents,
      totalCourses,
      totalTeachers,
      totalEnrollments,
      totalReviews,
      categoriesCount,
    ] = await Promise.all([
      this.userRepo.count({ where: { role: UserRole.STUDENT } }),
      this.courseRepo.count({ where: { status: CourseStatus.PUBLISHED } }),
      this.userRepo.count({ where: { role: UserRole.TEACHER } }),
      this.enrollmentRepo.count(),
      this.reviewRepo.count({ where: { isPublished: true } }),
      this.categoryRepo.count(),
    ]);

    // Calculate average rating
    const avgRatingResult = await this.reviewRepo
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .where('review.isPublished = :published', { published: true })
      .getRawOne();

    const averageRating = parseFloat(avgRatingResult?.avg || '0');

    // Get top categories
    const topCategories = await this.getTopCategories();

    // Get featured courses
    const featuredCourses = await this.getFeaturedCourses();

    return {
      totalStudents,
      totalCourses,
      totalTeachers,
      totalEnrollments,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      categoriesCount,
      topCategories,
      featuredCourses,
    };
  }

  private async getTopCategories(): Promise<CategoryStat[]> {
    const result = await this.categoryRepo
      .createQueryBuilder('category')
      .leftJoin('category.courses', 'course')
      .leftJoin('course.enrollments', 'enrollment')
      .select('category.id', 'id')
      .addSelect('category.name', 'name')
      .addSelect('COUNT(DISTINCT course.id)', 'courseCount')
      .addSelect('COUNT(DISTINCT enrollment.id)', 'enrollmentCount')
      .where('course.status = :status', { status: CourseStatus.PUBLISHED })
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('enrollmentCount', 'DESC')
      .limit(6)
      .getRawMany();

    return result.map((r) => ({
      id: r.id,
      name: r.name,
      courseCount: parseInt(r.courseCount) || 0,
      enrollmentCount: parseInt(r.enrollmentCount) || 0,
    }));
  }

  private async getFeaturedCourses(): Promise<FeaturedCourse[]> {
    const result = await this.courseRepo
      .createQueryBuilder('course')
      .leftJoin('course.teacher', 'teacher')
      .leftJoin('course.enrollments', 'enrollment')
      .select('course.id', 'id')
      .addSelect('course.title', 'title')
      .addSelect('course.thumbnail', 'thumbnail')
      .addSelect('teacher.name', 'teacherName')
      .addSelect('course.price', 'price')
      .addSelect('course.discountPrice', 'discountPrice')
      .addSelect('course.rating', 'rating')
      .addSelect('course.level', 'level')
      .addSelect('COUNT(enrollment.id)', 'enrollmentCount')
      .where('course.status = :status', { status: CourseStatus.PUBLISHED })
      .andWhere('course.isFeatured = :featured', { featured: true })
      .groupBy('course.id')
      .addGroupBy('course.title')
      .addGroupBy('course.thumbnail')
      .addGroupBy('teacher.name')
      .addGroupBy('course.price')
      .addGroupBy('course.discountPrice')
      .addGroupBy('course.rating')
      .addGroupBy('course.level')
      .orderBy('enrollmentCount', 'DESC')
      .limit(8)
      .getRawMany();

    return result.map((r) => ({
      id: r.id,
      title: r.title,
      thumbnail: r.thumbnail,
      teacherName: r.teacherName,
      price: parseFloat(r.price) || 0,
      discountPrice: r.discountPrice ? parseFloat(r.discountPrice) : null,
      rating: parseFloat(r.rating) || 0,
      enrollmentCount: parseInt(r.enrollmentCount) || 0,
      level: r.level,
    }));
  }
}
