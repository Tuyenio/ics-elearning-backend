import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const maxConnections = Number(process.env.DB_POOL_MAX ?? 1) || 1;
const idleTimeoutMillis = Number(process.env.DB_IDLE_TIMEOUT_MS ?? 10000) || 10000;
const connectionTimeoutMillis = Number(process.env.DB_CONN_TIMEOUT_MS ?? 5000) || 5000;
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
const dbPort = Number(process.env.DB_PORT ?? 5432) || 5432;

const dbConnectionOptions = databaseUrl
  ? { url: databaseUrl }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: dbPort,
      username: process.env.DB_USERNAME || 'postgres',
      password: String(process.env.DB_PASSWORD ?? ''),
      database: process.env.DB_NAME || 'postgres',
    };

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  ...dbConnectionOptions,
  entities: [path.join(__dirname, 'src', '**', '*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
  migrationsRun: false,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false,
  extra: {
    options: '-c search_path=learning,public',
    max: maxConnections,
    idleTimeoutMillis,
    connectionTimeoutMillis,
  },
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
