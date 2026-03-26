import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { Course } from './entities/course.entity';
import { Category } from '../categories/entities/category.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { InstructorSubscriptionsModule } from '../instructor-subscriptions/instructor-subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, Category, Enrollment]),
    InstructorSubscriptionsModule,
  ],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
