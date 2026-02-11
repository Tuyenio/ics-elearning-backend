import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon, CouponStatus, CouponType } from './entities/coupon.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async create(createCouponDto: CreateCouponDto, user: User): Promise<Coupon> {
    // Check if code already exists
    const existing = await this.couponRepository.findOne({
      where: { code: createCouponDto.code },
    });

    if (existing) {
      throw new ConflictException('Mã coupon đã tồn tại');
    }

    // Validate course if courseId provided
    if (createCouponDto.courseId) {
      const course = await this.courseRepository.findOne({
        where: { id: createCouponDto.courseId },
      });

      if (!course) {
        throw new NotFoundException('Khóa học không tìm thấy');
      }

      // Only teacher can create coupon for their own courses
      if (user.role === UserRole.TEACHER && course.teacherId !== user.id) {
        throw new BadRequestException(
          'Bạn chỉ có thể tạo coupon cho khóa học của bạn',
        );
      }
    }

    const coupon = this.couponRepository.create({
      ...createCouponDto,
      createdBy: user.id,
    });

    return this.couponRepository.save(coupon);
  }

  async findAll(user: User): Promise<Coupon[]> {
    const queryBuilder = this.couponRepository
      .createQueryBuilder('coupon')
      .leftJoinAndSelect('coupon.course', 'course')
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
      relations: ['course', 'creator'],
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

    if (
      updateCouponDto.courseId &&
      updateCouponDto.courseId !== coupon.courseId
    ) {
      const course = await this.courseRepository.findOne({
        where: { id: updateCouponDto.courseId },
      });

      if (!course) {
        throw new NotFoundException('Khóa học không tìm thấy');
      }

      if (user.role === UserRole.TEACHER && course.teacherId !== user.id) {
        throw new BadRequestException(
          'Bạn chỉ có thể gán coupon cho khóa học của bạn',
        );
      }
    }

    Object.assign(coupon, updateCouponDto);
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
    const coupon = await this.couponRepository.findOne({
      where: { code },
      relations: ['course'],
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
        message: 'Đã đạt giới hạn sở lần sử dụng mã giảm giá',
      };
    }

    // Check course restriction
    if (coupon.courseId && coupon.courseId !== courseId) {
      return {
        valid: false,
        message: 'Mã giảm giá không hợp lệ cho khóa học này',
      };
    }

    // Get course to calculate discount
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      return { valid: false, message: 'Khóa học không tìm thấy' };
    }

    const coursePrice = course.discountPrice || course.price || 0;

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
    const coupon = await this.couponRepository.findOne({
      where: { code },
    });

    if (coupon) {
      coupon.usedCount += 1;
      await this.couponRepository.save(coupon);
    }
  }
}
