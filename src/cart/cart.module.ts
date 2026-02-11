import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { Cart } from './entities/cart.entity';
import { Course } from '../courses/entities/course.entity';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [TypeOrmModule.forFeature([Cart, Course]), CacheModule.register()],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
