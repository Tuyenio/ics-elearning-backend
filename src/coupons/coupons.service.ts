import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Coupon,
  CouponApplyScope,
  CouponStatus,
  CouponType,
} from './entities/coupon.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Category } from '../categories/entities/category.entity';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  private resolveScopeFromPayload(payload: {
    applyScope?: CouponApplyScope;
    courseId?: string;
    teacherId?: string;
    categoryId?: string;
  }): CouponApplyScope {
    if (payload.applyScope) return payload.applyScope;
    if (payload.courseId) return CouponApplyScope.COURSE;
    if (payload.teacherId) return CouponApplyScope.TEACHER;
    if (payload.categoryId) return CouponApplyScope.CATEGORY;
    return CouponApplyScope.ALL;
  }

  private normalizeScopeTargets(payload: {
    applyScope: CouponApplyScope;
    courseId?: string;
    teacherId?: string;
    categoryId?: string;
  }) {
    if (payload.applyScope === CouponApplyScope.COURSE) {
      return {
        applyScope: payload.applyScope,
        courseId: payload.courseId,
        teacherId: undefined,
        categoryId: undefined,
      };
    }

    if (payload.applyScope === CouponApplyScope.TEACHER) {
      return {
        applyScope: payload.applyScope,
        courseId: undefined,
        teacherId: payload.teacherId,
        categoryId: undefined,
      };
    }

    if (payload.applyScope === CouponApplyScope.CATEGORY) {
      return {
        applyScope: payload.applyScope,
        courseId: undefined,
        teacherId: undefined,
        categoryId: payload.categoryId,
      };
    }

    return {
      applyScope: CouponApplyScope.ALL,
      courseId: undefined,
      teacherId: undefined,
      categoryId: undefined,
    };
  }

  private async validateScopeTargets(
    payload: {
      applyScope: CouponApplyScope;
      courseId?: string;
      teacherId?: string;
      categoryId?: string;
    },
    user: User,
  ) {
    const hasCourseId = Boolean(payload.courseId);
    const hasTeacherId = Boolean(payload.teacherId);
    const hasCategoryId = Boolean(payload.categoryId);
    const targetCount = [hasCourseId, hasTeacherId, hasCategoryId].filter(
      Boolean,
    ).length;

    if (targetCount > 1) {
      throw new BadRequestException(
        'Chỉ được chọn một phạm vi áp dụng cụ thể',
      );
    }

    if (user.role === UserRole.TEACHER && payload.applyScope === CouponApplyScope.ALL) {
      throw new BadRequestException(
        'Giảng viên không thể tạo mã áp dụng toàn hệ thống',
      );
    }

    if (payload.applyScope === CouponApplyScope.COURSE) {
      if (!payload.courseId) {
        throw new BadRequestException('Vui lòng chọn khóa học áp dụng');
      }

      const course = await this.courseRepository.findOne({
        where: { id: payload.courseId },
      });

      if (!course) {
        throw new NotFoundException('Khóa học không tìm thấy');
      }

      if (user.role === UserRole.TEACHER && course.teacherId !== user.id) {
        throw new BadRequestException(
          'Bạn chỉ có thể tạo coupon cho khóa học của bạn',
        );
      }

      return;
    }

    if (payload.applyScope === CouponApplyScope.TEACHER) {
      if (!payload.teacherId) {
        throw new BadRequestException('Vui lòng chọn giảng viên áp dụng');
      }

      const teacher = await this.userRepository.findOne({
        where: { id: payload.teacherId },
      });

      if (!teacher || teacher.role !== UserRole.TEACHER) {
        throw new NotFoundException('Giảng viên không tìm thấy');
      }

      if (user.role === UserRole.TEACHER && payload.teacherId !== user.id) {
        throw new BadRequestException(
          'Bạn chỉ có thể tạo coupon cho khóa học của bạn',
        );
      }

      const teacherCourseCount = await this.courseRepository.count({
        where: { teacherId: payload.teacherId },
      });

      if (teacherCourseCount === 0) {
        throw new BadRequestException(
          'Giảng viên chưa có khóa học để áp dụng coupon',
        );
      }

      return;
    }

    if (payload.applyScope === CouponApplyScope.CATEGORY) {
      if (!payload.categoryId) {
        throw new BadRequestException('Vui lòng chọn danh mục áp dụng');
      }

      const category = await this.categoryRepository.findOne({
        where: { id: payload.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Danh mục không tìm thấy');
      }

      if (user.role === UserRole.TEACHER) {
        const courseCount = await this.courseRepository.count({
          where: {
            teacherId: user.id,
            categoryId: payload.categoryId,
          },
        });

        if (courseCount === 0) {
          throw new BadRequestException(
            'Bạn chỉ có thể tạo coupon cho danh mục có khóa học của bạn',
          );
        }
      }
    }
  }

  private normalizeCode(code?: string): string {
    return String(code || '').trim().toUpperCase();
  }

  private async findByCodeInsensitive(code: string): Promise<Coupon | null> {
    return this.couponRepository
      .createQueryBuilder('coupon')
      .where('LOWER(coupon.code) = LOWER(:code)', { code })
      .getOne();
  }

  private validateDateRange(validFrom?: string | Date, validUntil?: string | Date) {
    if (!validFrom || !validUntil) return;

    const from = new Date(validFrom);
    const until = new Date(validUntil);

    if (Number.isNaN(from.getTime()) || Number.isNaN(until.getTime())) return;

    if (until <= from) {
      throw new BadRequestException('Ngày kết thúc phải lớn hơn ngày bắt đầu');
    }
  }

  private validateDiscountRules(
    type: CouponType,
    value: number,
    maxDiscount?: number,
  ) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException('Giá trị giảm giá phải lớn hơn 0');
    }

    if (type === CouponType.PERCENTAGE && value > 100) {
      throw new BadRequestException('Mã phần trăm không được vượt quá 100%');
    }

    if (type === CouponType.FIXED && maxDiscount !== undefined) {
      throw new BadRequestException(
        'Giảm cố định không hỗ trợ giới hạn giảm tối đa',
      );
    }
  }

  async getScopeOptions(user: User): Promise<{
    teachers: Array<{ id: string; name: string }>;
    courses: Array<{
      id: string;
      title: string;
      teacherId?: string;
      teacherName?: string;
      categoryId?: string;
      categoryName?: string;
    }>;
    categories: Array<{ id: string; name: string }>;
  }> {
    const coursesQb = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.teacher', 'teacher')
      .leftJoinAndSelect('course.category', 'category')
      .orderBy('course.title', 'ASC');

    if (user.role === UserRole.TEACHER) {
      coursesQb.where('course.teacherId = :teacherId', { teacherId: user.id });
    }

    const courseRows = await coursesQb.getMany();
    const courses = courseRows.map((course) => ({
      id: String(course.id),
      title: String(course.title || ''),
      teacherId: course.teacherId ? String(course.teacherId) : undefined,
      teacherName: course.teacher?.name ? String(course.teacher.name) : undefined,
      categoryId: course.categoryId ? String(course.categoryId) : undefined,
      categoryName: course.category?.name
        ? String(course.category.name)
        : undefined,
    }));

    const categoriesMap = new Map<string, { id: string; name: string }>();
    for (const course of courseRows) {
      if (course.categoryId && course.category?.name) {
        categoriesMap.set(String(course.categoryId), {
          id: String(course.categoryId),
          name: String(course.category.name),
        });
      }
    }

    const teachers =
      user.role === UserRole.TEACHER
        ? [{ id: user.id, name: user.name }]
        : await this.userRepository
            .createQueryBuilder('user')
            .select(['user.id', 'user.name'])
            .where('user.role = :role', { role: UserRole.TEACHER })
            .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
            .orderBy('user.name', 'ASC')
            .getMany()
            .then((rows) =>
              rows.map((row) => ({ id: String(row.id), name: String(row.name) })),
            );

    const categories =
      user.role === UserRole.ADMIN
        ? await this.categoryRepository
            .createQueryBuilder('category')
            .select(['category.id', 'category.name'])
            .where('category.isActive = :isActive', { isActive: true })
            .orderBy('category.name', 'ASC')
            .getMany()
            .then((rows) =>
              rows.map((row) => ({ id: String(row.id), name: String(row.name) })),
            )
        : Array.from(categoriesMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name),
          );

    return {
      teachers,
      courses,
      categories,
    };
  }

  async create(createCouponDto: CreateCouponDto, user: User): Promise<Coupon> {
    createCouponDto.code = this.normalizeCode(createCouponDto.code);
    this.validateDiscountRules(
      createCouponDto.type,
      Number(createCouponDto.value),
      createCouponDto.maxDiscount,
    );
    this.validateDateRange(createCouponDto.validFrom, createCouponDto.validUntil);

    // Check if code already exists (case-insensitive)
    const existing = await this.findByCodeInsensitive(createCouponDto.code);

    if (existing) {
      throw new ConflictException('Mã coupon đã tồn tại');
    }

    const createScopePayload = this.normalizeScopeTargets({
      applyScope: this.resolveScopeFromPayload(createCouponDto),
      courseId: createCouponDto.courseId,
      teacherId: createCouponDto.teacherId,
      categoryId: createCouponDto.categoryId,
    });

    await this.validateScopeTargets(createScopePayload, user);

    const coupon = this.couponRepository.create({
      ...createCouponDto,
      ...createScopePayload,
      createdBy: user.id,
    });

    return this.couponRepository.save(coupon);
  }

  async findAll(user: User): Promise<Coupon[]> {
    const queryBuilder = this.couponRepository
      .createQueryBuilder('coupon')
      .leftJoinAndSelect('coupon.course', 'course')
      .leftJoinAndSelect('coupon.teacher', 'teacher')
      .leftJoinAndSelect('coupon.category', 'category')
      .leftJoinAndSelect('coupon.creator', 'creator');

    // Teachers can only see their own coupons
    if (user.role === UserRole.TEACHER) {
      queryBuilder.where('coupon.createdBy = :userId', { userId: user.id });
    }

    return queryBuilder.orderBy('coupon.createdAt', 'DESC').getMany();
  }

  async findOne(id: string, user: User): Promise<Coupon> {
    const coupon = await this.couponRepository.findOne({
      where: { id },
      relations: ['course', 'teacher', 'category', 'creator'],
    });

    if (!coupon) {
      throw new NotFoundException('Coupon không tìm thấy');
    }

    // Teachers can only see their own coupons
    if (user.role === UserRole.TEACHER && coupon.createdBy !== user.id) {
      throw new BadRequestException('Truy cập bị từ chối');
    }

    return coupon;
  }

  async update(
    id: string,
    updateCouponDto: UpdateCouponDto,
    user: User,
  ): Promise<Coupon> {
    const coupon = await this.findOne(id, user);

    if (updateCouponDto.code !== undefined) {
      const normalizedCode = this.normalizeCode(updateCouponDto.code);
      const existing = await this.findByCodeInsensitive(normalizedCode);

      if (existing && existing.id !== coupon.id) {
        throw new ConflictException('Mã coupon đã tồn tại');
      }

      updateCouponDto.code = normalizedCode;
    }

    const nextType = updateCouponDto.type || coupon.type;
    const nextValue =
      updateCouponDto.value !== undefined
        ? Number(updateCouponDto.value)
        : Number(coupon.value);
    const nextMaxDiscount =
      updateCouponDto.maxDiscount !== undefined
        ? updateCouponDto.maxDiscount
        : coupon.maxDiscount;

    this.validateDiscountRules(nextType, nextValue, nextMaxDiscount);

    this.validateDateRange(
      updateCouponDto.validFrom !== undefined
        ? updateCouponDto.validFrom
        : coupon.validFrom,
      updateCouponDto.validUntil !== undefined
        ? updateCouponDto.validUntil
        : coupon.validUntil,
    );

    const nextScopePayload = this.normalizeScopeTargets({
      applyScope: this.resolveScopeFromPayload({
        applyScope: updateCouponDto.applyScope || coupon.applyScope,
        courseId:
          updateCouponDto.courseId !== undefined
            ? updateCouponDto.courseId
            : coupon.courseId,
        teacherId:
          updateCouponDto.teacherId !== undefined
            ? updateCouponDto.teacherId
            : coupon.teacherId,
        categoryId:
          updateCouponDto.categoryId !== undefined
            ? updateCouponDto.categoryId
            : coupon.categoryId,
      }),
      courseId:
        updateCouponDto.courseId !== undefined
          ? updateCouponDto.courseId
          : coupon.courseId,
      teacherId:
        updateCouponDto.teacherId !== undefined
          ? updateCouponDto.teacherId
          : coupon.teacherId,
      categoryId:
        updateCouponDto.categoryId !== undefined
          ? updateCouponDto.categoryId
          : coupon.categoryId,
    });

    await this.validateScopeTargets(nextScopePayload, user);

    Object.assign(coupon, {
      ...updateCouponDto,
      ...nextScopePayload,
    });
    return this.couponRepository.save(coupon);
  }

  async remove(id: string, user: User): Promise<void> {
    const coupon = await this.findOne(id, user);
    await this.couponRepository.remove(coupon);
  }

  async validateCoupon(
    code: string,
    courseId: string,
  ): Promise<{
    valid: boolean;
    coupon?: Coupon;
    discount?: number;
    message?: string;
  }> {
    const normalizedCode = this.normalizeCode(code);

    // Get course first to validate coupon scope
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      return { valid: false, message: 'Khóa học không tìm thấy' };
    }

    const coupon = await this.couponRepository.findOne({
      where: { code: normalizedCode },
      relations: ['course', 'teacher', 'category'],
    });

    if (!coupon) {
      return { valid: false, message: 'Mã giảm giá không tìm thấy' };
    }

    // Check status
    if (coupon.status !== CouponStatus.ACTIVE) {
      return { valid: false, message: 'Mã giảm giá chưa kích hoạt' };
    }

    // Check dates
    const now = new Date();
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
      return { valid: false, message: 'Mã giảm giá chưa có hiệu lực' };
    }
    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
      return { valid: false, message: 'Mã giảm giá đã hết hạn' };
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return {
        valid: false,
        message: 'Đã đạt giới hạn số lần sử dụng mã giảm giá',
      };
    }

    const applyScope = coupon.applyScope || CouponApplyScope.ALL;

    // Backward compatibility for old coupons without applyScope
    if (
      applyScope === CouponApplyScope.ALL &&
      coupon.courseId &&
      coupon.courseId !== courseId
    ) {
      return {
        valid: false,
        message: 'Mã giảm giá không hợp lệ cho khóa học này',
      };
    }

    if (
      applyScope === CouponApplyScope.COURSE &&
      coupon.courseId &&
      coupon.courseId !== courseId
    ) {
      return {
        valid: false,
        message: 'Mã giảm giá không hợp lệ cho khóa học này',
      };
    }

    if (
      applyScope === CouponApplyScope.TEACHER &&
      coupon.teacherId &&
      coupon.teacherId !== course.teacherId
    ) {
      return {
        valid: false,
        message: 'Mã giảm giá chỉ áp dụng cho khóa học của giảng viên chỉ định',
      };
    }

    if (
      applyScope === CouponApplyScope.CATEGORY &&
      coupon.categoryId &&
      coupon.categoryId !== course.categoryId
    ) {
      return {
        valid: false,
        message: 'Mã giảm giá chỉ áp dụng cho danh mục khóa học chỉ định',
      };
    }

    const basePrice = Number(course.price || 0);
    const discountPrice = Number(course.discountPrice || 0);
    const coursePrice =
      discountPrice > 0 && discountPrice < basePrice
        ? discountPrice
        : basePrice;

    // Check minimum purchase
    if (coupon.minPurchase && coursePrice < coupon.minPurchase) {
      return {
        valid: false,
        message: `Số tiền mua hàng tối thiểu là ${coupon.minPurchase}`,
      };
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === CouponType.PERCENTAGE) {
      discount = (coursePrice * coupon.value) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.value;
    }

    // Ensure discount doesn't exceed course price
    if (discount > coursePrice) {
      discount = coursePrice;
    }

    return {
      valid: true,
      coupon,
      discount,
      message: 'Mã giảm giá hợp lệ',
    };
  }

  async applyCoupon(code: string): Promise<void> {
    const normalizedCode = this.normalizeCode(code);
    const coupon = await this.couponRepository.findOne({
      where: { code: normalizedCode },
    });

    if (coupon) {
      coupon.usedCount += 1;
      await this.couponRepository.save(coupon);
    }
  }
}
