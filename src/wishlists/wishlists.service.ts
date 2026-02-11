import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';

@Injectable()
export class WishlistsService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async addToWishlist(courseId: string, student: User): Promise<Wishlist> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tìm thấy');
    }

    // Check if already in wishlist
    const existingWishlist = await this.wishlistRepository.findOne({
      where: {
        studentId: student.id,
        courseId,
      },
    });

    if (existingWishlist) {
      throw new ConflictException('Khóa học đã có trong danh sách yêu thích');
    }

    const wishlist = this.wishlistRepository.create({
      studentId: student.id,
      courseId,
    });

    return this.wishlistRepository.save(wishlist);
  }

  async removeFromWishlist(courseId: string, student: User): Promise<void> {
    const wishlist = await this.wishlistRepository.findOne({
      where: {
        studentId: student.id,
        courseId,
      },
    });

    if (!wishlist) {
      throw new NotFoundException(
        'Khóa học không tìm thấy trong danh sách yêu thích',
      );
    }

    await this.wishlistRepository.remove(wishlist);
  }

  async findByStudent(studentId: string): Promise<Wishlist[]> {
    return this.wishlistRepository.find({
      where: { studentId },
      relations: ['course', 'course.teacher', 'course.category'],
      order: { createdAt: 'DESC' },
    });
  }

  async isInWishlist(courseId: string, studentId: string): Promise<boolean> {
    const wishlist = await this.wishlistRepository.findOne({
      where: {
        studentId,
        courseId,
      },
    });

    return !!wishlist;
  }
}
