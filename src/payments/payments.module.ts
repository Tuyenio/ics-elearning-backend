import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from './entities/payment.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import { LessonProgress } from '../lesson-progress/entities/lesson-progress.entity';
import { VNPayService } from './vnpay.service';
import { MomoService } from './momo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Course, Enrollment, Lesson, LessonProgress]),
    ConfigModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, VNPayService, MomoService],
  exports: [PaymentsService, VNPayService, MomoService],
})
export class PaymentsModule {}
