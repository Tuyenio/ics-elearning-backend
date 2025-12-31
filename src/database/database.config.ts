import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigModule } from '@nestjs/config';

// Load environment variables
ConfigModule.forRoot();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
  migrationsTableName: 'migrations',
  synchronize: false, // Important: disable synchronize in production, use migrations instead
  migrationsRun: false, // Set to true to auto-run migrations on startup (handled in app.module.ts)
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.DATABASE_SSL === 'true' ? {
    rejectUnauthorized: false,
  } : false,
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
