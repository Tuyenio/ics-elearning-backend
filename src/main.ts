import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  
  // Enable CORS
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

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

  await app.listen(port);
  
  logger.log(`🚀 Server running on: http://localhost:${port}`);
  logger.log(`📝 Environment: ${nodeEnv}`);
  logger.log(`🌐 Frontend URL: ${frontendUrl}`);
  logger.log(`🔧 API Prefix: /api`);
}
bootstrap();

