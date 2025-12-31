import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { seedDatabase } from '../database/seed';

async function setupDatabase() {
  const app = await NestFactory.create(AppModule);
  const dataSource = app.get(getDataSourceToken());

  try {
    console.log('🔄 Initializing database connection...');
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    console.log('⚠️  Dropping all tables and schema...');
    await dataSource.dropDatabase();
    console.log('✅ Database dropped successfully!');

    console.log('🔄 Creating fresh schema from entities...');
    await dataSource.synchronize();
    console.log('✅ Schema created successfully!');

    // Note: Migrations are not run as we use synchronize() for development
    // If you want to use migrations, remove synchronize() and use runMigrations() instead

    console.log('🌱 Running seed data...');
    await seedDatabase(dataSource);
    console.log('✅ Seed data inserted successfully!');

    console.log('\n✨ Database setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

setupDatabase();
