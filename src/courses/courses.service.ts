import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Course, CourseStatus } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { CourseFilters, FilterOption, PriceRange } from './dto/course-filters.dto';
import { Category } from '../categories/entities/category.entity';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createCourseDto: CreateCourseDto, teacher: User): Promise<Course> {
    const slug = createCourseDto.slug || this.generateSlug(createCourseDto.title);

    const existingCourse = await this.courseRepository.findOne({
      where: { slug },
    });

    if (existingCourse) {
      throw new ConflictException('Khóa học với slug này đã tồn tại');
    }

    const course = this.courseRepository.create({
      ...createCourseDto,
      slug,
      teacherId: teacher.id,
    });

    return this.courseRepository.save(course);
  }

  async findAll(search?: string, categoryId?: string): Promise<Course[]> {
    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.teacher', 'teacher')
      .leftJoinAndSelect('course.category', 'category')
      .where('course.status = :status', { status: CourseStatus.PUBLISHED });

    if (search) {
      queryBuilder.andWhere(
        '(course.title ILIKE :search OR course.description ILIKE :search OR course.tags::text ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (categoryId) {
      queryBuilder.andWhere('course.categoryId = :categoryId', { categoryId });
    }

    return queryBuilder.orderBy('course.createdAt', 'DESC').getMany();
  }

  async findFeatured(): Promise<Course[]> {
    return this.courseRepository.find({
      where: { isFeatured: true, status: CourseStatus.PUBLISHED },
      relations: ['teacher', 'category'],
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }

  async findBestsellers(): Promise<Course[]> {
    return this.courseRepository.find({
      where: { isBestseller: true, status: CourseStatus.PUBLISHED },
      relations: ['teacher', 'category'],
      order: { enrollmentCount: 'DESC' },
      take: 10,
    });
  }

  async findByTeacher(teacherId: string): Promise<Course[]> {
    return this.courseRepository.find({
      where: { teacherId },
      relations: ['category', 'lessons'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['teacher', 'category', 'lessons', 'reviews'],
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tìm thấy');
    }

    return course;
  }

  async findBySlug(slug: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { slug },
      relations: ['teacher', 'category', 'lessons', 'reviews'],
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tìm thấy');
    }

    return course;
  }

  async update(
    id: string,
    updateCourseDto: UpdateCourseDto,
    user: User,
  ): Promise<Course> {
    const course = await this.findOne(id);

    // Check permissions
    if (user.role !== UserRole.ADMIN && course.teacherId !== user.id) {
      throw new ForbiddenException('Bạn chỉ có thể cập nhật khóa học của bạn');
    }

    if (updateCourseDto.slug && updateCourseDto.slug !== course.slug) {
      const existingCourse = await this.courseRepository.findOne({
        where: { slug: updateCourseDto.slug },
      });

      if (existingCourse && existingCourse.id !== id) {
        throw new ConflictException('Khóa học với slug này đã tồn tại');
      }
    }

    Object.assign(course, updateCourseDto);
    return this.courseRepository.save(course);
  }

  async remove(id: string, user: User): Promise<void> {
    const course = await this.findOne(id);

    // Check permissions
    if (user.role !== UserRole.ADMIN && course.teacherId !== user.id) {
      throw new ForbiddenException('Bạn chỉ có thể xóa khóa học của bạn');
    }

    await this.courseRepository.remove(course);
  }

  async updateRating(courseId: string): Promise<void> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['reviews'],
    });

    if (!course) return;

    const publishedReviews = course.reviews.filter((r) => r.isPublished);
    const reviewCount = publishedReviews.length;

    if (reviewCount > 0) {
      const totalRating = publishedReviews.reduce((sum, r) => sum + r.rating, 0);
      course.rating = totalRating / reviewCount;
      course.reviewCount = reviewCount;
    } else {
      course.rating = 0;
      course.reviewCount = 0;
    }

    await this.courseRepository.save(course);
  }

  async incrementEnrollmentCount(courseId: string): Promise<void> {
    await this.courseRepository.increment({ id: courseId }, 'enrollmentCount', 1);
  }

  async findByStatus(status: string): Promise<Course[]> {
    return this.courseRepository.find({
      where: { status: status as any },
      relations: ['teacher', 'category'],
      order: { createdAt: 'DESC' },
    });
  }

  async approveCourse(id: string): Promise<Course> {
    const course = await this.findOne(id);
    course.status = 'published' as any;
    return this.courseRepository.save(course);
  }

  async rejectCourse(id: string, reason: string): Promise<Course> {
    const course = await this.findOne(id);
    course.status = 'rejected' as any;
    course.rejectionReason = reason;
    return this.courseRepository.save(course);
  }

  async submitForApproval(id: string, user: User): Promise<Course> {
    const course = await this.findOne(id);

    if (course.teacherId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Bạn chỉ có thể gửi khóa học của bạn');
    }

    course.status = 'pending' as any;
    return this.courseRepository.save(course);
  }

  async getAvailableFilters(): Promise<CourseFilters> {
    // Get categories with course counts
    const categoriesData = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoin('category.courses', 'course')
      .select('category.id', 'value')
      .addSelect('category.name', 'label')
      .addSelect('COUNT(course.id)', 'count')
      .where('course.isPublished = :published', { published: true })
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('count', 'DESC')
      .getRawMany();

    const categories: FilterOption[] = categoriesData.map(c => ({
      value: c.value,
      label: c.label,
      count: parseInt(c.count) || 0,
    }));

    // Get levels with counts
    const levelsData = await this.courseRepository
      .createQueryBuilder('course')
      .select('course.level', 'value')
      .addSelect('course.level', 'label')
      .addSelect('COUNT(*)', 'count')
      .where('course.isPublished = :published', { published: true })
      .groupBy('course.level')
      .getRawMany();

    const levels: FilterOption[] = levelsData.map(l => ({
      value: l.value,
      label: this.formatLevel(l.value),
      count: parseInt(l.count) || 0,
    }));

    // Get price ranges
    const priceRanges: PriceRange[] = [
      { min: 0, max: 0, label: 'Free', count: 0 },
      { min: 1, max: 500000, label: 'Under 500K', count: 0 },
      { min: 500000, max: 1000000, label: '500K - 1M', count: 0 },
      { min: 1000000, max: 2000000, label: '1M - 2M', count: 0 },
      { min: 2000000, max: 999999999, label: 'Over 2M', count: 0 },
    ];

    for (const range of priceRanges) {
      const count = await this.courseRepository
        .createQueryBuilder('course')
        .where('course.isPublished = :published', { published: true })
        .andWhere('course.price >= :min', { min: range.min })
        .andWhere('course.price < :max', { max: range.max === 0 ? 1 : range.max })
        .getCount();
      
      range.count = count;
    }

    // Get languages with counts
    const languagesData = await this.courseRepository
      .createQueryBuilder('course')
      .select('course.language', 'value')
      .addSelect('course.language', 'label')
      .addSelect('COUNT(*)', 'count')
      .where('course.isPublished = :published', { published: true })
      .groupBy('course.language')
      .getRawMany();

    const languages: FilterOption[] = languagesData.map(l => ({
      value: l.value,
      label: this.formatLanguage(l.value),
      count: parseInt(l.count) || 0,
    }));

    // Get rating ranges
    const ratings: FilterOption[] = [
      { value: '4.5', label: '4.5 & up', count: 0 },
      { value: '4.0', label: '4.0 & up', count: 0 },
      { value: '3.5', label: '3.5 & up', count: 0 },
      { value: '3.0', label: '3.0 & up', count: 0 },
    ];

    for (const rating of ratings) {
      const count = await this.courseRepository
        .createQueryBuilder('course')
        .where('course.isPublished = :published', { published: true })
        .andWhere('course.rating >= :rating', { rating: parseFloat(rating.value) })
        .getCount();
      
      rating.count = count;
    }

    return {
      categories,
      levels,
      priceRanges,
      languages,
      ratings,
    };
  }

  private formatLevel(level: string): string {
    const levels = {
      beginner: 'Cơ bản',
      intermediate: 'Trung bình',
      advanced: 'Nâng cao',
      'all-levels': 'Tất cả cấp độ',
    };
    return levels[level] || level;
  }

  private formatLanguage(language: string): string {
    const languages = {
      en: 'Tiếng Anh',
      vi: 'Tiếng Việt',
      'vi-en': 'Tiếng Việt & Tiếng Anh',
    };
    return languages[language] || language;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
