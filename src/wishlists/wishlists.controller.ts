import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WishlistsService } from './wishlists.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';

@Controller('wishlists')
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Post('course/:courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  addToWishlist(@Param('courseId') courseId: string, @GetUser() user: User) {
    return this.wishlistsService.addToWishlist(courseId, user);
  }

  @Delete('course/:courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  removeFromWishlist(
    @Param('courseId') courseId: string,
    @GetUser() user: User,
  ) {
    return this.wishlistsService.removeFromWishlist(courseId, user);
  }

  @Get('my-wishlist')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  findMyWishlist(@GetUser() user: User) {
    return this.wishlistsService.findByStudent(user.id);
  }

  @Get('check/:courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  checkWishlist(@Param('courseId') courseId: string, @GetUser() user: User) {
    return this.wishlistsService.isInWishlist(courseId, user.id);
  }
}
