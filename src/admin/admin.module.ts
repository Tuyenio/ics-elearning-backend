import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Category } from '../categories/entities/category.entity';
import { Review } from '../reviews/entities/review.entity';
import { CertificatesModule } from '../certificates/certificates.module';
import { ExamsModule } from '../exams/exams.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Course,
      Payment,
      Enrollment,
      Category,
      Review,
    ]),
    CertificatesModule,
    ExamsModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
