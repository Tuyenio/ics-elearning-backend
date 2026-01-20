import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@ApiTags('cart')
@ApiBearerAuth()
@Controller('cart')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @ApiOperation({ summary: 'Thêm khóa học vào giỏ hàng' })
  @ApiResponse({ status: 201, description: 'Đã thêm vào giỏ hàng thành công' })
  addToCart(@Body() addToCartDto: AddToCartDto, @GetUser() user: User) {
    return this.cartService.addToCart(addToCartDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách khóa học trong giỏ hàng' })
  getCart(@GetUser() user: User) {
    return this.cartService.getCart(user);
  }

  @Get('count')
  @ApiOperation({ summary: 'Lấy số lượng khóa học trong giỏ hàng' })
  getCartCount(@GetUser() user: User) {
    return this.cartService.getCartCount(user);
  }

  @Get('total')
  @ApiOperation({ summary: 'Lấy tổng giá trị giỏ hàng' })
  getCartTotal(@GetUser() user: User) {
    return this.cartService.getCartTotal(user);
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Xóa toàn bộ giỏ hàng' })
  clearCart(@GetUser() user: User) {
    return this.cartService.clearCart(user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa một khóa học khỏi giỏ hàng' })
  removeFromCart(@Param('id') id: string, @GetUser() user: User) {
    return this.cartService.removeFromCart(id, user);
  }
}
