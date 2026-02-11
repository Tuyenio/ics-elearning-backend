import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Tạo đánh giá khóa học' })
  create(@Body() createReviewDto: CreateReviewDto, @GetUser() user: User) {
    return this.reviewsService.create(createReviewDto, user);
  }

  @Get('course/:courseId')
  findByCourse(
    @Param('courseId') courseId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.reviewsService.findByCourse(courseId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      sortBy: sortBy || 'createdAt',
    });
  }

  @Get('my-reviews')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  findMyReviews(@GetUser() user: User) {
    return this.reviewsService.findByStudent(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @GetUser() user: User,
  ) {
    return this.reviewsService.update(id, updateReviewDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.reviewsService.remove(id, user);
  }

  @Patch(':id/toggle-publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  togglePublish(@Param('id') id: string) {
    return this.reviewsService.togglePublish(id);
  }

  @Patch(':id/helpful')
  @UseGuards(JwtAuthGuard)
  incrementHelpful(@Param('id') id: string) {
    return this.reviewsService.incrementHelpfulCount(id);
  }

  @Post(':id/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  replyToReview(
    @Param('id') id: string,
    @Body() replyDto: ReplyReviewDto,
    @Req() req: any,
  ) {
    return this.reviewsService.replyToReview(
      id,
      replyDto.reply,
      req.user.userId,
    );
  }
}
