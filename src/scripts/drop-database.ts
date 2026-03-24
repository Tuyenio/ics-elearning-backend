import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../data-source';

const asRows = <T extends string>(
  rows: unknown,
  key: T,
): Array<Record<T, string>> => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .filter(
      (row): row is Record<string, unknown> =>
        typeof row === 'object' && row !== null,
    )
    .map((row) => ({
      [key]: typeof row[key] === 'string' ? row[key] : '',
    })) as Array<Record<T, string>>;
};

async function dropDatabase() {
  const dataSource = new DataSource(dataSourceOptions);

  try {
    console.log('🔄 Connecting to database...');
    await dataSource.initialize();

    console.log('⚠️  Dropping learning schema...');
    await dataSource.query('DROP SCHEMA IF EXISTS "learning" CASCADE');

    console.log('⚠️  Dropping public schema objects...');
    // Drop all tables that may exist in public schema (except system tables)
    const tablesRaw: unknown = await dataSource.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const tables = asRows(tablesRaw, 'table_name');
    for (const t of tables) {
      await dataSource.query(
        `DROP TABLE IF EXISTS "public"."${t.table_name}" CASCADE`,
      );
    }

    // Drop all enum types that may exist in public schema
    const enumsRaw: unknown = await dataSource.query(`
      SELECT t.typname FROM pg_type t
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public' AND t.typtype = 'e'
    `);
    const enums = asRows(enumsRaw, 'typname');
    for (const e of enums) {
      await dataSource.query(
        `DROP TYPE IF EXISTS "public"."${e.typname}" CASCADE`,
      );
    }

    // Drop all sequences in public schema
    const sequencesRaw: unknown = await dataSource.query(`
      SELECT sequence_name FROM information_schema.sequences
      WHERE sequence_schema = 'public'
    `);
    const sequences = asRows(sequencesRaw, 'sequence_name');
    for (const s of sequences) {
      await dataSource.query(
        `DROP SEQUENCE IF EXISTS "public"."${s.sequence_name}" CASCADE`,
      );
    }

    console.log('✅ Database dropped successfully!');
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

void dropDatabase();
