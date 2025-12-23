import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { CoursesModule } from './courses/courses.module';
import { LessonsModule } from './lessons/lessons.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { LessonProgressModule } from './lesson-progress/lesson-progress.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { CertificatesModule } from './certificates/certificates.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotesModule } from './notes/notes.module';
import { WishlistsModule } from './wishlists/wishlists.module';
import { ExamsModule } from './exams/exams.module';
import { NotificationsModule } from './notifications/notifications.module';
import { Exam } from './exams/entities/exam.entity';
import { ExamAttempt } from './exams/entities/exam-attempt.entity';
import { User } from './users/entities/user.entity';
import { Category } from './categories/entities/category.entity';
import { Course } from './courses/entities/course.entity';
import { Lesson } from './lessons/entities/lesson.entity';
import { Enrollment } from './enrollments/entities/enrollment.entity';
import { LessonProgress } from './lesson-progress/entities/lesson-progress.entity';
import { Quiz } from './quizzes/entities/quiz.entity';
import { QuizAttempt } from './quizzes/entities/quiz-attempt.entity';
import { Certificate } from './certificates/entities/certificate.entity';
import { CertificateTemplate } from './certificates/entities/certificate-template.entity';
import { Payment } from './payments/entities/payment.entity';
import { Review } from './reviews/entities/review.entity';
import { Note } from './notes/entities/note.entity';
import { Wishlist } from './wishlists/entities/wishlist.entity';
import { Notification } from './notifications/entities/notification.entity';
import { TwoFactorAuth } from './auth/entities/two-factor-auth.entity';
import { UserSession } from './auth/entities/user-session.entity';
import { ActivityLog } from './common/entities/activity-log.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [
        User,
        Category,
        Course,
        Lesson,
        Enrollment,
        LessonProgress,
        Quiz,
        QuizAttempt,
        Certificate,
        CertificateTemplate,
        Payment,
        Review,
        Note,
        Wishlist,
        Exam,
        ExamAttempt,
        Notification,
        TwoFactorAuth,
        UserSession,
        ActivityLog,
      ],
      synchronize: true,
      ssl: true,
      extra: {
        ssl: {
          rejectUnauthorized: false,
        },
      },
    }),
    AuthModule,
    UsersModule,
    CategoriesModule,
    CoursesModule,
    LessonsModule,
    EnrollmentsModule,
    LessonProgressModule,
    QuizzesModule,
    CertificatesModule,
    PaymentsModule,
    ReviewsModule,
    NotesModule,
    WishlistsModule,
    ExamsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
