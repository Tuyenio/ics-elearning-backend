import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production',
        migrationsRun: true, // Auto-run migrations on startup
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('DATABASE_SSL') === 'true' ? {
          rejectUnauthorized: false,
        } : false,
      }),
    }),
  ],
})
export class DatabaseModule {}
