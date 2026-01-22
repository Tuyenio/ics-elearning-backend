import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import session from 'express-session';
import passport from 'passport';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Get configuration
  const port = configService.get<number>('port', 5001);
  const frontendUrl = configService.get<string>('frontendUrl', 'http://localhost:3000');
  const nodeEnv = configService.get<string>('nodeEnv', 'development');
  
  // Enable CORS with multiple origins support
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    frontendUrl,
  ].filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(null, true); // Still allow in development
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400, // 24 hours
  });

  // Session middleware for Passport OAuth
  app.use(
    session({
      secret: 'your-secret-key-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: nodeEnv === 'production', // Use secure in production
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    }),
  );

  // Passport middleware for OAuth
  app.use(passport.initialize());
  app.use(passport.session());

  // Global filters
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ICS E-Learning Platform API')
      .setDescription('Backend API for ICS E-Learning Platform - Comprehensive online learning system')
      .setVersion('1.0')
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('courses', 'Course management')
      .addTag('lessons', 'Lesson management')
      .addTag('enrollments', 'Enrollment operations')
      .addTag('payments', 'Payment processing')
      .addTag('reviews', 'Course reviews')
      .addTag('exams', 'Exam management')
      .addTag('certificates', 'Certificate generation')
      .addTag('categories', 'Category management')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
    });

    logger.log(`📖 Swagger docs available at: http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  
  logger.log(`🚀 Server running on: http://localhost:${port}`);
  logger.log(`📝 Environment: ${nodeEnv}`);
  logger.log(`🌐 Frontend URL: ${frontendUrl}`);
  logger.log(`🔧 API Prefix: /api`);
}
bootstrap();

