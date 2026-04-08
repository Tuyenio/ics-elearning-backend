import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { Course, CourseStatus } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import {
  CertificateTemplate,
  TemplateStatus,
} from '../certificates/entities/certificate-template.entity';
import {
  CourseFilters,
  FilterOption,
  PriceRange,
} from './dto/course-filters.dto';
import { Category } from '../categories/entities/category.entity';
import { InstructorSubscriptionsService } from '../instructor-subscriptions/instructor-subscriptions.service';
import { Exam, ExamType } from '../exams/entities/exam.entity';
import {
  ExtractedExam,
  ExtractedExamType,
} from '../exams/entities/extracted-exam.entity';

type FilterRow = { value: string; label: string; count: string };

type CourseRatingDistributionItem = {
  stars: number;
  count: number;
  percentage: number;
};

type CourseWithRatingDistribution = Course & {
  ratingDistribution: CourseRatingDistributionItem[];
  publishedReviewCount: number;
};

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(CertificateTemplate)
    private readonly certificateTemplateRepository: Repository<CertificateTemplate>,
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    @InjectRepository(ExtractedExam)
    private readonly extractedExamRepository: Repository<ExtractedExam>,
    private readonly instructorSubscriptionsService: InstructorSubscriptionsService,
  ) {}

  async findCourseEnrollments(id: string, user: User): Promise<Enrollment[]> {
    const course = await this.courseRepository.findOne({
      where: { id },
      select: ['id', 'teacherId'],
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tìm thấy');
    }

    // Admin can view all courses; teacher can only view their own course enrollments.
    if (user.role !== UserRole.ADMIN && course.teacherId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền truy cập khóa học này');
    }

    return this.enrollmentRepository.find({
      where: {
        courseId: id,
      },
      relations: ['student'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    createCourseDto: CreateCourseDto,
    teacher: User,
  ): Promise<Course> {
    if (teacher.role === UserRole.TEACHER) {
      await this.instructorSubscriptionsService.enforceTeacherCourseLimit(
        teacher.id,
      );
    }

    const baseSlug =
      createCourseDto.slug || this.generateSlug(createCourseDto.title);
    const slug = await this.generateUniqueSlug(baseSlug);

    const course = this.courseRepository.create({
      ...createCourseDto,
      slug,
      teacherId: teacher.id,
    });

    return this.courseRepository.save(course);
  }

  async findAll(options?: {
    search?: string;
    categoryId?: string;
    level?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{
    data: Course[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.teacher', 'teacher')
      .leftJoinAndSelect('course.category', 'category')
      .where('course.status = :status', { status: CourseStatus.PUBLISHED });

    this.applyLatestPublishedPerLineageFilter(queryBuilder, 'course');

    if (options?.search) {
      queryBuilder.andWhere(
        '(course.title ILIKE :search OR course.description ILIKE :search OR course.tags::text ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    if (options?.categoryId) {
      queryBuilder.andWhere('course.categoryId = :categoryId', {
        categoryId: options.categoryId,
      });
    }

    if (options?.level) {
      queryBuilder.andWhere('course.level = :level', { level: options.level });
    }

    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'DESC';
    queryBuilder.orderBy(`course.${sortBy}`, sortOrder);

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findFeatured(): Promise<Course[]> {
    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.teacher', 'teacher')
      .leftJoinAndSelect('course.category', 'category')
      .where('course.isFeatured = :isFeatured', { isFeatured: true })
      .andWhere('course.status = :status', { status: CourseStatus.PUBLISHED })
      .orderBy('course.createdAt', 'DESC')
      .take(10);

    this.applyLatestPublishedPerLineageFilter(queryBuilder, 'course');

    return queryBuilder.getMany();
  }

  async findAllAdmin(options?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Course[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.teacher', 'teacher')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.lessons', 'lessons');

    if (options?.status && options.status !== 'all') {
      qb.andWhere('course.status = :status', { status: options.status });
    } else {
      qb.andWhere('course.status != :draftStatus', {
        draftStatus: CourseStatus.DRAFT,
      });
    }

    if (options?.search) {
      qb.andWhere(
        '(course.title ILIKE :search OR course.description ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    qb.orderBy('course.createdAt', 'DESC');

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAllByTeacher(
    teacherId: string,
    options?: { status?: string; search?: string },
  ): Promise<Course[]> {
    const qb = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.lessons', 'lessons')
      .where('course.teacherId = :teacherId', { teacherId });

    if (options?.status && options.status !== 'all') {
      qb.andWhere('course.status = :status', { status: options.status });
    }

    if (options?.search) {
      qb.andWhere('course.title ILIKE :search', {
        search: `%${options.search}%`,
      });
    }

    qb.orderBy('course.createdAt', 'DESC');
    return qb.getMany();
  }

  async findBestsellers(): Promise<Course[]> {
    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.teacher', 'teacher')
      .leftJoinAndSelect('course.category', 'category')
      .where('course.isBestseller = :isBestseller', { isBestseller: true })
      .andWhere('course.status = :status', { status: CourseStatus.PUBLISHED })
      .orderBy('course.enrollmentCount', 'DESC')
      .take(10);

    this.applyLatestPublishedPerLineageFilter(queryBuilder, 'course');

    return queryBuilder.getMany();
  }

  async findByTeacher(teacherId: string): Promise<Course[]> {
    const courses = await this.courseRepository.find({
      where: { teacherId },
      relations: ['category', 'lessons'],
      order: { createdAt: 'DESC' },
    });

    if (courses.length === 0) {
      return courses;
    }

    // Keep enrollmentCount in sync with actual enrollments to avoid stale values.
    const courseIds = courses.map((course) => course.id);
    const rows = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoin('course.enrollments', 'enrollment')
      .select('course.id', 'courseId')
      .addSelect('COUNT(enrollment.id)', 'count')
      .where('course.id IN (:...courseIds)', { courseIds })
      .andWhere('enrollment.status IN (:...statuses)', {
        statuses: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
      })
      .groupBy('course.id')
      .getRawMany<{ courseId: string; count: string }>();

    const countMap = new Map<string, number>(
      rows.map((row) => [row.courseId, Number(row.count || 0)]),
    );

    return courses.map((course) => ({
      ...course,
      enrollmentCount: countMap.get(course.id) ?? 0,
    }));
  }

  async findOne(id: string): Promise<CourseWithRatingDistribution> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['teacher', 'category', 'lessons', 'reviews'],
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tìm thấy');
    }

    return this.attachRatingDistribution(course);
  }

  async findBySlug(slug: string): Promise<CourseWithRatingDistribution> {
    const course = await this.courseRepository.findOne({
      where: { slug },
      relations: ['teacher', 'category', 'lessons', 'reviews'],
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tìm thấy');
    }

    return this.attachRatingDistribution(course);
  }

  private attachRatingDistribution(
    course: Course,
  ): CourseWithRatingDistribution {
    const ratingDistribution = this.buildRatingDistribution(course.reviews);
    const publishedReviewCount = ratingDistribution.reduce(
      (sum, item) => sum + item.count,
      0,
    );

    return Object.assign(course, {
      ratingDistribution,
      publishedReviewCount,
    });
  }

  private buildRatingDistribution(
    reviews: Course['reviews'],
  ): CourseRatingDistributionItem[] {
    const buckets = new Map<number, number>([
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [5, 0],
    ]);

    for (const review of reviews || []) {
      if (!review?.isPublished) continue;
      const stars = Number(review.rating);
      if (!Number.isInteger(stars) || stars < 1 || stars > 5) continue;
      buckets.set(stars, (buckets.get(stars) || 0) + 1);
    }

    const total = Array.from(buckets.values()).reduce(
      (sum, count) => sum + count,
      0,
    );

    return [5, 4, 3, 2, 1].map((stars) => {
      const count = buckets.get(stars) || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return { stars, count, percentage };
    });
  }

  async update(
    id: string,
    updateCourseDto: UpdateCourseDto,
    user: User,
  ): Promise<Course> {
    const extendedUpdates = updateCourseDto as UpdateCourseDto &
      Partial<Pick<Course, 'duration' | 'isBestseller'>>;

    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['teacher', 'category', 'lessons', 'reviews'],
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tìm thấy');
    }

    // Check permissions
    if (user.role !== UserRole.ADMIN && course.teacherId !== user.id) {
      throw new ForbiddenException('Bạn chỉ có thể cập nhật khóa học của bạn');
    }

    const shouldCreateRevision =
      user.role === UserRole.TEACHER &&
      course.status === CourseStatus.PUBLISHED;

    if (shouldCreateRevision) {
      const revisionSlugBase =
        updateCourseDto.slug || `${course.slug}-v${Date.now().toString(36)}`;
      const revisionSlug = await this.generateUniqueSlug(revisionSlugBase);
      const rootCourseId = course.sourceCourseId || course.id;

      return this.courseRepository.manager.transaction(async (manager) => {
        const revisionRepository = manager.getRepository(Course);

        const revision = revisionRepository.create({
          title: updateCourseDto.title ?? course.title,
          slug: revisionSlug,
          description: updateCourseDto.description ?? course.description,
          shortDescription:
            updateCourseDto.shortDescription ?? course.shortDescription,
          thumbnail: updateCourseDto.thumbnail ?? course.thumbnail,
          previewVideo: updateCourseDto.previewVideo ?? course.previewVideo,
          price:
            updateCourseDto.price !== undefined
              ? Number(updateCourseDto.price)
              : Number(course.price || 0),
          discountPrice:
            updateCourseDto.discountPrice !== undefined
              ? Number(updateCourseDto.discountPrice)
              : Number(course.discountPrice || 0),
          level: updateCourseDto.level ?? course.level,
          status: CourseStatus.PENDING,
          rejectionReason: '',
          sourceCourseId: rootCourseId,
          duration: extendedUpdates.duration ?? course.duration,
          requirements: updateCourseDto.requirements ?? course.requirements,
          outcomes: updateCourseDto.outcomes ?? course.outcomes,
          tags: updateCourseDto.tags ?? course.tags,
          enrollmentCount: 0,
          rating: 0,
          reviewCount: 0,
          isFeatured: updateCourseDto.isFeatured ?? course.isFeatured,
          isBestseller: extendedUpdates.isBestseller ?? false,
          teacherId: course.teacherId,
          categoryId: updateCourseDto.categoryId ?? course.categoryId,
        });

        const savedRevision = await revisionRepository.save(revision);

        await this.cloneAssessmentAndCertificateSetup(
          manager,
          course.id,
          savedRevision.id,
          course.teacherId,
        );

        return savedRevision;
      });
    }

    if (updateCourseDto.slug && updateCourseDto.slug !== course.slug) {
      const uniqueSlug = await this.generateUniqueSlug(updateCourseDto.slug, id);
      updateCourseDto.slug = uniqueSlug;
    }

    Object.assign(course, updateCourseDto);

    // Nếu khóa học đã được duyệt, mọi chỉnh sửa sẽ trả về chờ duyệt lại.
    if (course.status === CourseStatus.PUBLISHED) {
      course.status = CourseStatus.PENDING;
      course.rejectionReason = '';
    }

    return this.courseRepository.save(course);
  }

  async remove(id: string, user: User): Promise<void> {
    const course = await this.findOne(id);

    // Check permissions - admin can delete any course
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
      const totalRating = publishedReviews.reduce(
        (sum, r) => sum + r.rating,
        0,
      );
      course.rating = totalRating / reviewCount;
      course.reviewCount = reviewCount;
    } else {
      course.rating = 0;
      course.reviewCount = 0;
    }

    await this.courseRepository.save(course);
  }

  async incrementEnrollmentCount(courseId: string): Promise<void> {
    await this.courseRepository.increment(
      { id: courseId },
      'enrollmentCount',
      1,
    );
  }

  async findByStatus(status: CourseStatus): Promise<Course[]> {
    return this.courseRepository.find({
      where: { status },
      relations: ['teacher', 'category'],
      order: { createdAt: 'DESC' },
    });
  }

  async approveCourse(id: string): Promise<Course> {
    const course = await this.courseRepository.findOne({ where: { id } });

    if (!course) {
      throw new NotFoundException('Khóa học không tìm thấy');
    }

    course.status = CourseStatus.PUBLISHED;
    course.rejectionReason = '';
    const savedCourse = await this.courseRepository.save(course);

    await this.archivePublishedLineageVersionsWithoutUnfinishedLearners(
      savedCourse.id,
    );

    // Keep compatibility with deployments that still rely on isPublished flag.
    try {
      await this.courseRepository.query(
        'UPDATE learning.courses SET "isPublished" = $1 WHERE id = $2',
        [true, id],
      );
    } catch {
      // Ignore when schema does not include this legacy column.
    }

    return savedCourse;
  }

  async archivePublishedLineageVersionsWithoutUnfinishedLearners(
    courseId: string,
  ): Promise<void> {
    const referenceCourse = await this.courseRepository.findOne({
      where: { id: courseId },
      select: ['id', 'sourceCourseId'],
    });

    if (!referenceCourse) {
      return;
    }

    const rootCourseId = referenceCourse.sourceCourseId || referenceCourse.id;

    const publishedVersions = await this.courseRepository.find({
      where: [
        { id: rootCourseId, status: CourseStatus.PUBLISHED },
        { sourceCourseId: rootCourseId, status: CourseStatus.PUBLISHED },
      ],
      select: ['id', 'createdAt'],
    });

    if (publishedVersions.length <= 1) {
      return;
    }

    const latestPublishedVersion = [...publishedVersions].sort((a, b) => {
      const timeDiff = b.createdAt.getTime() - a.createdAt.getTime();
      if (timeDiff !== 0) {
        return timeDiff;
      }
      return b.id.localeCompare(a.id);
    })[0];

    const candidateIds = publishedVersions
      .map((version) => version.id)
      .filter((versionId) => versionId !== latestPublishedVersion.id);

    const archiveIds: string[] = [];

    for (const candidateId of candidateIds) {
      const hasUnfinishedLearners =
        await this.versionHasUnfinishedLearners(candidateId);
      if (!hasUnfinishedLearners) {
        archiveIds.push(candidateId);
      }
    }

    if (archiveIds.length === 0) {
      return;
    }

    await this.courseRepository
      .createQueryBuilder()
      .update(Course)
      .set({ status: CourseStatus.ARCHIVED })
      .where('id IN (:...archiveIds)', { archiveIds })
      .execute();

    // Keep compatibility with deployments that still rely on legacy isPublished flag.
    try {
      const placeholders = archiveIds
        .map((_, index) => `$${index + 2}`)
        .join(',');
      await this.courseRepository.query(
        `UPDATE learning.courses
           SET "isPublished" = $1
         WHERE id IN (${placeholders})`,
        [false, ...archiveIds],
      );
    } catch {
      // Ignore when schema does not include this legacy column.
    }
  }

  async rejectCourse(id: string, reason: string): Promise<Course> {
    const course = await this.findOne(id);
    course.status = CourseStatus.REJECTED;
    course.rejectionReason = reason;
    const savedCourse = await this.courseRepository.save(course);

    // Keep compatibility with deployments that still rely on isPublished flag.
    try {
      await this.courseRepository.query(
        'UPDATE learning.courses SET "isPublished" = $1 WHERE id = $2',
        [false, id],
      );
    } catch {
      // Ignore when schema does not include this legacy column.
    }

    return savedCourse;
  }

  async submitForApproval(id: string, user: User): Promise<Course> {
    const course = await this.findOne(id);

    if (course.teacherId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Bạn chỉ có thể gửi khóa học của bạn');
    }

    course.status = CourseStatus.PENDING;
    course.rejectionReason = '';
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
      .getRawMany<FilterRow>();

    const categories: FilterOption[] = categoriesData.map((c) => ({
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
      .getRawMany<FilterRow>();

    const levels: FilterOption[] = levelsData.map((l) => ({
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
        .andWhere('course.price < :max', {
          max: range.max === 0 ? 1 : range.max,
        })
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
      .getRawMany<FilterRow>();

    const languages: FilterOption[] = languagesData.map((l) => ({
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
        .andWhere('course.rating >= :rating', {
          rating: parseFloat(rating.value),
        })
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
    const levels: Record<string, string> = {
      beginner: 'Cơ bản',
      intermediate: 'Trung bình',
      advanced: 'Nâng cao',
      'all-levels': 'Tất cả cấp độ',
    };
    return levels[level] || level;
  }

  private formatLanguage(language: string): string {
    const languages: Record<string, string> = {
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

  private async generateUniqueSlug(
    baseSlug: string,
    excludeCourseId?: string,
  ): Promise<string> {
    const safeBase = (baseSlug || `khoa-hoc-${Date.now()}`)
      .trim()
      .toLowerCase();
    let candidate = safeBase;
    let index = 1;

    while (true) {
      const existing = await this.courseRepository.findOne({
        where: { slug: candidate },
      });
      if (!existing || existing.id === excludeCourseId) {
        return candidate;
      }
      index += 1;
      candidate = `${safeBase}-${index}`;
    }
  }

  private applyLatestPublishedPerLineageFilter(
    queryBuilder: SelectQueryBuilder<any>,
    alias: string,
  ): void {
    queryBuilder.andWhere(
      `NOT EXISTS (
         SELECT 1
         FROM learning.courses newer
         WHERE newer.status = :lineagePublishedStatus
           AND COALESCE(newer."sourceCourseId", newer.id) = COALESCE(${alias}."sourceCourseId", ${alias}.id)
           AND (
             newer."createdAt" > ${alias}."createdAt"
             OR (newer."createdAt" = ${alias}."createdAt" AND newer.id > ${alias}.id)
           )
       )`,
      { lineagePublishedStatus: CourseStatus.PUBLISHED },
    );
  }

  private async versionHasUnfinishedLearners(courseId: string): Promise<boolean> {
    const activeLearnerCount = await this.enrollmentRepository.count({
      where: { courseId, status: EnrollmentStatus.ACTIVE },
    });

    if (activeLearnerCount > 0) {
      return true;
    }

    const [officialExamCount, officialExtractedExamCount] = await Promise.all([
      this.examRepository.count({ where: { courseId, type: ExamType.OFFICIAL } }),
      this.extractedExamRepository.count({
        where: { courseId, type: ExtractedExamType.OFFICIAL },
      }),
    ]);

    const hasOfficialAssessment =
      officialExamCount + officialExtractedExamCount > 0;

    if (!hasOfficialAssessment) {
      return false;
    }

    const learnersWithoutCertificate = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoin(
        Certificate,
        'certificate',
        'certificate."enrollmentId" = enrollment.id',
      )
      .where('enrollment."courseId" = :courseId', { courseId })
      .andWhere('enrollment.status IN (:...statuses)', {
        statuses: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
      })
      .andWhere('certificate.id IS NULL')
      .getCount();

    return learnersWithoutCertificate > 0;
  }

  private async cloneAssessmentAndCertificateSetup(
    manager: EntityManager,
    sourceCourseId: string,
    targetCourseId: string,
    teacherId: string,
  ): Promise<void> {
    const templateRepository = manager.getRepository(CertificateTemplate);
    const examRepository = manager.getRepository(Exam);
    const extractedExamRepository = manager.getRepository(ExtractedExam);

    const sourceTemplates = await templateRepository.find({
      where: { courseId: sourceCourseId, teacherId },
      order: { createdAt: 'ASC' },
    });

    const sourceExams = await examRepository.find({
      where: { courseId: sourceCourseId, teacherId },
      order: { createdAt: 'ASC' },
    });

    const sourceExtractedExams = await extractedExamRepository.find({
      where: { courseId: sourceCourseId, teacherId },
      order: { createdAt: 'ASC' },
    });

    const templateIdMap = new Map<string, string>();

    if (sourceTemplates.length > 0) {
      const clonedTemplates = sourceTemplates.map((template) =>
        templateRepository.create({
          title: template.title,
          description: template.description,
          courseId: targetCourseId,
          teacherId,
          validityPeriod: template.validityPeriod,
          backgroundColor: template.backgroundColor,
          borderColor: template.borderColor,
          borderStyle: template.borderStyle,
          textColor: template.textColor,
          logoUrl: template.logoUrl,
          signatureUrl: template.signatureUrl,
          templateImageUrl: template.templateImageUrl,
          templateStyle: template.templateStyle,
          badgeStyle: template.badgeStyle,
          status: template.status || TemplateStatus.DRAFT,
          rejectionReason: template.rejectionReason,
          issuedCount: 0,
        }),
      );

      const savedTemplates = await templateRepository.save(clonedTemplates);

      sourceTemplates.forEach((sourceTemplate, index) => {
        templateIdMap.set(sourceTemplate.id, savedTemplates[index].id);
      });
    }

    if (sourceExams.length > 0) {
      const clonedExams = sourceExams.map((exam) => {
        const mappedTemplateId = exam.certificateTemplateId
          ? templateIdMap.get(exam.certificateTemplateId)
          : undefined;

        return examRepository.create({
          title: exam.title,
          description: exam.description,
          type: exam.type,
          status: exam.status,
          questions: exam.questions,
          timeLimit: exam.timeLimit,
          passingScore: exam.passingScore,
          maxAttempts: exam.maxAttempts,
          shuffleQuestions: exam.shuffleQuestions,
          shuffleAnswers: exam.shuffleAnswers,
          showCorrectAnswers: exam.showCorrectAnswers,
          availableFrom: exam.availableFrom,
          availableUntil: exam.availableUntil,
          certificateTemplateId: mappedTemplateId,
          rejectionReason: exam.rejectionReason,
          courseId: targetCourseId,
          teacherId,
        });
      });

      await examRepository.save(clonedExams);
    }

    if (sourceExtractedExams.length > 0) {
      const clonedExtractedExams = sourceExtractedExams.map((exam) =>
        extractedExamRepository.create({
          title: exam.title,
          description: exam.description,
          type: exam.type,
          status: exam.status,
          questions: exam.questions,
          timeLimit: exam.timeLimit,
          passingScore: exam.passingScore,
          maxAttempts: exam.maxAttempts,
          shuffleQuestions: exam.shuffleQuestions,
          shuffleAnswers: exam.shuffleAnswers,
          showCorrectAnswers: exam.showCorrectAnswers,
          availableFrom: exam.availableFrom,
          availableUntil: exam.availableUntil,
          certificateTemplateId: exam.certificateTemplateId
            ? (templateIdMap.get(exam.certificateTemplateId) ?? null)
            : null,
          variantCount: exam.variantCount,
          variants: exam.variants,
          sourceExamId: exam.sourceExamId || exam.id,
          courseId: targetCourseId,
          teacherId,
        }),
      );

      await extractedExamRepository.save(clonedExtractedExams);
    }
  }
}
