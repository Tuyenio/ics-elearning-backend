import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

async function dropDatabase() {
  const app = await NestFactory.create(AppModule);
  const dataSource = app.get(getDataSourceToken());

  try {
    console.log('🔄 Connecting to database...');
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    console.log('⚠️  Dropping all tables...');
    // Drop all tables with cascade
    await dataSource.dropDatabase();
    console.log('✅ Database dropped successfully!');

    // Optionally, you can recreate the schema
    console.log('🔄 Creating fresh schema...');
    await dataSource.synchronize();
    console.log('✅ Schema created successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error dropping database:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

dropDatabase();
