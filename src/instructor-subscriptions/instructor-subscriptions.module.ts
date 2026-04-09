import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../courses/entities/course.entity';
import { User } from '../users/entities/user.entity';
import { InstructorSubscriptionsController } from './instructor-subscriptions.controller';
import { InstructorSubscriptionsService } from './instructor-subscriptions.service';
import { InstructorPaymentMethod } from './entities/instructor-payment-method.entity';
import { InstructorPlan } from './entities/instructor-plan.entity';
import { InstructorSubscription } from './entities/instructor-subscription.entity';
import { InstructorSubscriptionPayment } from './entities/instructor-subscription-payment.entity';
import { WalletModule } from '../wallet/wallet.module';
import { AdminAuditLog } from '../admin/entities/admin-audit-log.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';

@Module({
  imports: [
    WalletModule,
    TypeOrmModule.forFeature([
      InstructorPlan,
      InstructorSubscription,
      InstructorSubscriptionPayment,
      InstructorPaymentMethod,
      Course,
      Enrollment,
      User,
      AdminAuditLog,
    ]),
  ],
  controllers: [InstructorSubscriptionsController],
  providers: [InstructorSubscriptionsService],
  exports: [InstructorSubscriptionsService],
})
export class InstructorSubscriptionsModule {}
