import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { seedDatabase } from '../database/seed';

@Injectable()
export class DatabaseSeederService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseSeederService.name);

  constructor(
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const nodeEnv = this.configService.get('NODE_ENV');
    const autoSeed = this.configService.get('AUTO_SEED_DB', 'false') === 'true';

    // Only auto-seed in development or if AUTO_SEED_DB is explicitly set
    if (nodeEnv === 'production' && !autoSeed) {
      this.logger.log(
        'Skipping auto-seed in production (set AUTO_SEED_DB=true to enable)',
      );
      return;
    }

    try {
      // Check if database is empty (check users table)
      const userCount = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM users',
      );

      const count = parseInt(userCount[0].count);

      if (count === 0) {
        this.logger.log('📦 Database is empty, starting auto-seed...');
        await seedDatabase(this.dataSource);
        this.logger.log('✅ Database seeded successfully!');
      } else {
        this.logger.log(
          `📊 Database already has ${count} users, skipping seed`,
        );
      }
    } catch (error) {
      // If table doesn't exist, migrations haven't run yet
      if (error.code === '42P01') {
        this.logger.warn(
          '⚠️  Tables not found. Waiting for migrations to complete...',
        );
        // Wait a bit and try again
        setTimeout(() => this.onModuleInit(), 2000);
      } else {
        this.logger.error('❌ Error during database seeding:', error.message);
      }
    }
  }
}
