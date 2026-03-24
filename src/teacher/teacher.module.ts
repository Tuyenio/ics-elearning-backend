import { Module } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { TeacherController } from './teacher.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Review } from '../reviews/entities/review.entity';
import { Assignment, AssignmentSubmission } from '../assignments/entities/assignment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      Enrollment,
      Payment,
      Review,
      Assignment,
      AssignmentSubmission,
    ]),
  ],
  providers: [TeacherService],
  controllers: [TeacherController],
})
export class TeacherModule {}
