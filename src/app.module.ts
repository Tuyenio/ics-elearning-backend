import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
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
import { InstructorSubscriptionsModule } from './instructor-subscriptions/instructor-subscriptions.module';
import { WalletModule } from './wallet/wallet.module';

const envFileCandidates = [
  `.env.${process.env.NODE_ENV || 'development'}.local`,
  `.env.${process.env.NODE_ENV || 'development'}`,
  '.env.local',
  '.env',
];

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
      envFilePath: envFileCandidates,
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
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uploadRoot =
          configService.get<string>('UPLOAD_ROOT') ||
          join(process.cwd(), 'uploads');

        if (!existsSync(uploadRoot)) {
          mkdirSync(uploadRoot, { recursive: true });
        }

        return [
          {
            rootPath: uploadRoot,
            serveRoot: '/uploads',
          },
        ];
      },
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
      useFactory: (configService: ConfigService) => {
        const maxConnections =
          Number(configService.get('DB_POOL_MAX') ?? 1) || 1;
        const idleTimeoutMillis =
          Number(configService.get('DB_IDLE_TIMEOUT_MS') ?? 10000) || 10000;
        const connectionTimeoutMillis =
          Number(configService.get('DB_CONN_TIMEOUT_MS') ?? 5000) || 5000;
        const databaseUrl = String(configService.get('DATABASE_URL') ?? '').trim();
        const dbConnection = databaseUrl
          ? { url: databaseUrl }
          : {
              host: configService.get('DB_HOST') || 'localhost',
              port: Number(configService.get('DB_PORT') ?? 5432) || 5432,
              username: configService.get('DB_USERNAME') || 'postgres',
              password: String(configService.get('DB_PASSWORD') ?? ''),
              database: configService.get('DB_NAME') || 'postgres',
            };

        return {
          type: 'postgres',
          ...dbConnection,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
          synchronize: false,
          migrationsRun: true,
          logging: configService.get('NODE_ENV') === 'development',
          ssl:
            configService.get('DATABASE_SSL') === 'true'
              ? {
                  rejectUnauthorized: false,
                }
              : false,
          extra: {
            // Set search_path so that "learning" schema is resolved first, then "public"
            // Safe even before "learning" schema exists (PG skips non-existent schemas)
            options: '-c search_path=learning,public',
            max: maxConnections,
            idleTimeoutMillis,
            connectionTimeoutMillis,
            ...(configService.get('DATABASE_SSL') === 'true'
              ? {
                  ssl: {
                    rejectUnauthorized: false,
                  },
                }
              : {}),
          },
        };
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
    InstructorSubscriptionsModule,
    WalletModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
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
