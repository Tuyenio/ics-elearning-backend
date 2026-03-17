import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../courses/entities/course.entity';
import { User } from '../users/entities/user.entity';
import { InstructorSubscriptionsController } from './instructor-subscriptions.controller';
import { InstructorSubscriptionsService } from './instructor-subscriptions.service';
import { InstructorPlan } from './entities/instructor-plan.entity';
import { InstructorSubscription } from './entities/instructor-subscription.entity';
import { InstructorSubscriptionPayment } from './entities/instructor-subscription-payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InstructorPlan,
      InstructorSubscription,
      InstructorSubscriptionPayment,
      Course,
      User,
    ]),
  ],
  controllers: [InstructorSubscriptionsController],
  providers: [InstructorSubscriptionsService],
  exports: [InstructorSubscriptionsService],
})
export class InstructorSubscriptionsModule {}
