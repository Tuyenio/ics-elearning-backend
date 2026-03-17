import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
import passport from 'passport';
import { join } from 'path';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Serve static files from uploads directory
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // Get configuration
  const port = configService.get<number>('port', 5001);
  const frontendUrl = configService.get<string>(
    'frontendUrl',
    'http://localhost:3000',
  );
  const nodeEnv = configService.get<string>('nodeEnv', 'development');

  // Enable CORS with dynamic origin support for both localhost and network IPs
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, curl requests)
      if (!origin) {
        logger.debug('Request without origin detected (mobile app or curl)');
        return callback(null, true);
      }

      // In development mode, allow all localhost and private IP ranges
      if (nodeEnv === 'development') {
        // Allow localhost (port 3000, 3001, or any port)
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          logger.debug(`Allowed localhost origin: ${origin}`);
          return callback(null, true);
        }

        // Allow private IP ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        if (
          origin.match(/http:\/\/(192\.168|10|172\.(1[6-9]|2[0-9]|3[01]))\.\d+\.\d+:\d+/) ||
          origin.match(/http:\/\/[a-zA-Z0-9\-]+\.local:\d+/) // Allow *.local (mDNS)
        ) {
          logger.debug(`Allowed private IP origin: ${origin}`);
          return callback(null, true);
        }

        // In development, also allow explicitly configured frontend URL
        if (frontendUrl && origin === frontendUrl) {
          logger.debug(`Allowed configured frontend URL: ${origin}`);
          return callback(null, true);
        }

        // Allow all origins in development mode (last resort)
        logger.warn(`Development mode: Allowing origin: ${origin}`);
        return callback(null, true);
      }

      // In production, be strict
      const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        frontendUrl,
      ].filter(Boolean);

      if (allowedOrigins.includes(origin)) {
        logger.debug(`Allowed production origin: ${origin}`);
        return callback(null, true);
      }

      logger.warn(`CORS blocked request from origin: ${origin}`);
      return callback(new Error(`CORS policy: origin not allowed`));
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

  // Increase body size limit to handle quiz payloads with embedded images (base64 data URLs)
  app.use(require('express').json({ limit: '50mb' }));
  app.use(require('express').urlencoded({ limit: '50mb', extended: true }));

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


  // Swagger documentation
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ICS E-Learning Platform API')
      .setDescription(
        'Backend API for ICS E-Learning Platform - Comprehensive online learning system',
      )
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

    logger.log(
      `📖 Swagger docs available at: http://localhost:${port}/docs`,
    );
  }

  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Server running on: http://0.0.0.0:${port}`);
  logger.log(`🌐 Network URL: http://192.168.1.10:${port}`);
  logger.log(`📝 Environment: ${nodeEnv}`);
  logger.log(`🌐 Frontend URL: ${frontendUrl}`);
}
bootstrap();
