import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async addToCart(addToCartDto: AddToCartDto, user: User): Promise<Cart> {
    const { courseId } = addToCartDto;

    // Check if course exists
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tìm thấy');
    }

    // Check if already in cart
    const existingItem = await this.cartRepository.findOne({
      where: {
        userId: user.id,
        courseId,
      },
    });

    if (existingItem) {
      throw new BadRequestException('Khóa học đã có trong giỏ hàng');
    }

    // Add to cart
    const cartItem = this.cartRepository.create({
      userId: user.id,
      courseId,
      price: course.discountPrice || course.price,
    });

    return this.cartRepository.save(cartItem);
  }

  async getCart(user: User): Promise<Cart[]> {
    return this.cartRepository.find({
      where: { userId: user.id },
      relations: ['course', 'course.teacher', 'course.category'],
      order: { createdAt: 'DESC' },
    });
  }

  async removeFromCart(id: string, user: User): Promise<void> {
    const cartItem = await this.cartRepository.findOne({
      where: { id, userId: user.id },
    });

    if (!cartItem) {
      throw new NotFoundException('Mục giỏ hàng không tìm thấy');
    }

    await this.cartRepository.remove(cartItem);
  }

  async clearCart(user: User): Promise<void> {
    await this.cartRepository.delete({ userId: user.id });
  }

  async getCartCount(user: User): Promise<number> {
    return this.cartRepository.count({
      where: { userId: user.id },
    });
  }

  async getCartTotal(user: User): Promise<number> {
    const cartItems = await this.cartRepository.find({
      where: { userId: user.id },
      relations: ['course'],
    });

    return cartItems.reduce((total, item) => {
      const price = item.course.discountPrice || item.course.price || 0;
      return total + Number(price);
    }, 0);
  }
}
