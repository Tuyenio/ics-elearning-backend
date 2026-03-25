import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const maxConnections = Number(process.env.DB_POOL_MAX ?? 1) || 1;
const idleTimeoutMillis = Number(process.env.DB_IDLE_TIMEOUT_MS ?? 10000) || 10000;
const connectionTimeoutMillis = Number(process.env.DB_CONN_TIMEOUT_MS ?? 5000) || 5000;

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
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
