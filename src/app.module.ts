import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseSeederService } from './database/database-seeder.service';
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
import { AnnouncementsModule } from './announcements/announcements.module';
import { DiscussionsModule } from './discussions/discussions.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { ResourcesModule } from './resources/resources.module';
import { CartModule } from './cart/cart.module';
import { CouponsModule } from './coupons/coupons.module';
import { AdminModule } from './admin/admin.module';
import { TeacherModule } from './teacher/teacher.module';
import { ProgressModule } from './progress/progress.module';
import { StatsModule } from './stats/stats.module';
import { UploadModule } from './upload/upload.module';
import { SystemSettingsModule } from './system-settings/system-setting.module';
import { MaintenanceGuard } from './common/guards/maintenance.guard';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from './schedule/schedule.module';

@Module({
  imports: [
    SystemSettingsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 900000, // 15 minutes
        limit: 1000, // 1000 requests per 15 minutes
      },
    ]),
    // Static file serving for uploads
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    // Cache configuration
    CacheModule.register({
      isGlobal: true,
      ttl: 5,
      max: 100, // Maximum number of items in cache
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development', // Auto-sync in development
        migrationsRun: false, // Disable auto-run migrations (use scripts instead)
        logging: configService.get('NODE_ENV') === 'development',
        ssl:
          configService.get('DATABASE_SSL') === 'true'
            ? {
                rejectUnauthorized: false,
              }
            : false,
        extra:
          configService.get('DATABASE_SSL') === 'true'
            ? {
                ssl: {
                  rejectUnauthorized: false,
                },
              }
            : undefined,
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
    AnnouncementsModule,
    DiscussionsModule,
    AssignmentsModule,
    ResourcesModule,
    CartModule,
    CouponsModule,
    AdminModule,
    TeacherModule,
    ProgressModule,
    StatsModule,
    UploadModule,
    ScheduleModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DatabaseSeederService,
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: MaintenanceGuard,
    },
  ],
})
export class AppModule {}
