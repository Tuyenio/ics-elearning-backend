/**
 * Script chạy 1 lần: Xóa tất cả bảng còn lại trong schema public
 * (trừ bảng migrations của TypeORM)
 *
 * Chạy: npx ts-node -r tsconfig-paths/register src/scripts/cleanup-public-schema.ts
 */
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

type PublicEnumRow = { typname: string };
type PublicTableRow = { tablename: string };

const readStringRows = <T extends string>(
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

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: false,
});

async function cleanupPublicSchema() {
  console.log('🗑️  Bắt đầu dọn dẹp schema public...\n');

  await AppDataSource.initialize();
  console.log('✅ Đã kết nối database\n');

  const qr = AppDataSource.createQueryRunner();
  await qr.connect();

  try {
    // Lấy danh sách các enum type trong public schema
    const enumsRes: unknown = await qr.query(
      `SELECT t.typname
       FROM pg_type t
       JOIN pg_namespace n ON t.typnamespace = n.oid
       WHERE t.typtype = 'e'
         AND n.nspname = 'public'
       ORDER BY t.typname`,
    );

    // Lấy danh sách bảng trong public schema, bỏ qua bảng migrations
    const tablesRes: unknown = await qr.query(
      `SELECT tablename
       FROM pg_tables
       WHERE schemaname = 'public'
         AND tablename != 'migrations'
       ORDER BY tablename`,
    );

    const tables: string[] = readStringRows(tablesRes, 'tablename').map(
      (r: PublicTableRow) => r.tablename,
    );
    const enums: string[] = readStringRows(enumsRes, 'typname').map(
      (r: PublicEnumRow) => r.typname,
    );

    console.log(
      `📊 Tìm thấy ${tables.length} bảng cần xóa trong schema public:`,
    );
    tables.forEach((t) => console.log(`   - ${t}`));
    console.log('');

    console.log(
      `📋 Tìm thấy ${enums.length} enum type cần xóa trong schema public:`,
    );
    enums.forEach((e) => console.log(`   - ${e}`));
    console.log('');

    // Xóa tất cả bảng (CASCADE để xóa cả FK constraints)
    if (tables.length > 0) {
      console.log('🗑️  Đang xóa các bảng...');
      for (const table of tables) {
        await qr.query(`DROP TABLE IF EXISTS "public"."${table}" CASCADE`);
        console.log(`   ✓ Đã xóa bảng: ${table}`);
      }
      console.log('');
    }

    // Xóa tất cả enum type trong public
    if (enums.length > 0) {
      console.log('🗑️  Đang xóa các enum type...');
      for (const e of enums) {
        await qr.query(`DROP TYPE IF EXISTS "public"."${e}" CASCADE`);
        console.log(`   ✓ Đã xóa enum: ${e}`);
      }
      console.log('');
    }

    // Kiểm tra lại sau khi xóa
    const remaining: unknown = await qr.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    );
    const remainingEnums: unknown = await qr.query(
      `SELECT t.typname FROM pg_type t
       JOIN pg_namespace n ON t.typnamespace = n.oid
       WHERE t.typtype = 'e' AND n.nspname = 'public'`,
    );

    const remainingTables = readStringRows(remaining, 'tablename').map(
      (r: PublicTableRow) => r.tablename,
    );
    const remainingEnumNames = readStringRows(remainingEnums, 'typname').map(
      (r: PublicEnumRow) => r.typname,
    );

    console.log(`✅ Schema public còn lại:`);
    console.log(`   - Bảng: ${remainingTables.join(', ') || '(trống)'}`);
    console.log(`   - Enum: ${remainingEnumNames.join(', ') || '(trống)'}`);
    console.log('\n🎉 Dọn dẹp schema public hoàn tất!');
  } finally {
    await qr.release();
    await AppDataSource.destroy();
  }
}

cleanupPublicSchema().catch((err) => {
  console.error('\n❌ Lỗi:', getErrorMessage(err));
  process.exit(1);
});
