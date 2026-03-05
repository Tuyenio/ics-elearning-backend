import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../data-source';

async function setupDatabase() {
  const dataSource = new DataSource(dataSourceOptions);

  try {
    console.log('🔄 Connecting to database...');
    await dataSource.initialize();

    console.log('🔄 Running migrations...');
    const migrations = await dataSource.runMigrations({ transaction: 'each' });
    console.log(`✅ ${migrations.length} migration(s) executed successfully!`);

    for (const m of migrations) {
      console.log(`  - ${m.name}`);
    }

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
