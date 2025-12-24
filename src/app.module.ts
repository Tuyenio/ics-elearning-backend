import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production',
        migrationsRun: true,
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('DATABASE_SSL') === 'true' ? {
          rejectUnauthorized: false,
        } : false,
        extra: configService.get('DATABASE_SSL') === 'true' ? {
          ssl: {
            rejectUnauthorized: false,
          },
        } : undefined,
      }),
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
