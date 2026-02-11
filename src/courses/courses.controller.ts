import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  create(@Body() createCourseDto: CreateCourseDto, @GetUser() user: User) {
    return this.coursesService.create(createCourseDto, user);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('level') level?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.coursesService.findAll({
      search,
      categoryId,
      level,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'DESC',
    });
  }

  @Get('filters')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600000) // Cache for 10 minutes
  getFilters() {
    return this.coursesService.getAvailableFilters();
  }

  @Get('featured')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // Cache for 5 minutes
  findFeatured() {
    return this.coursesService.findFeatured();
  }

  @Get('bestsellers')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // Cache for 5 minutes
  findBestsellers() {
    return this.coursesService.findBestsellers();
  }

  @Get('teacher/:teacherId')
  findByTeacher(@Param('teacherId') teacherId: string) {
    return this.coursesService.findByTeacher(teacherId);
  }

  @Get('my-courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  findMyCourses(@GetUser() user: User) {
    return this.coursesService.findByTeacher(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.coursesService.findBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @GetUser() user: User,
  ) {
    return this.coursesService.update(id, updateCourseDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.coursesService.remove(id, user);
  }

  // Admin endpoints
  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findPending() {
    return this.coursesService.findByStatus('pending');
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  approve(@Param('id') id: string) {
    return this.coursesService.approveCourse(id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.coursesService.rejectCourse(id, reason);
  }

  // Teacher endpoints
  @Patch(':id/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  submit(@Param('id') id: string, @GetUser() user: User) {
    return this.coursesService.submitForApproval(id, user);
  }
}
