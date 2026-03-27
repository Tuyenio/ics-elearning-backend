import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const TARGET_ADMIN_EMAIL = 'tt98tuyen@gmail.com';
const KEEP_TABLES = new Set(['users', 'categories']);

type TableRow = { tablename: string };
type CountRow = { count: string };

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: false,
  extra: {
    options: '-c search_path=learning,public',
  },
});

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function cleanupKeepAdminAndCategories() {
  console.log('Bat dau don du lieu schema learning...');
  console.log('Dieu kien giu lai: 1 user admin theo email va bang categories.\n');

  await AppDataSource.initialize();
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();

  try {
    await qr.query('SET search_path TO learning, public');

    const tablesRaw: unknown = await qr.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'learning'
      ORDER BY tablename
    `);
    const allTables = Array.isArray(tablesRaw)
      ? (tablesRaw as TableRow[])
          .map((r) => r.tablename)
          .filter((name): name is string => typeof name === 'string' && name.length > 0)
      : [];

    if (allTables.length === 0) {
      throw new Error('Khong tim thay bang nao trong schema learning.');
    }

    const tablesToDelete = allTables.filter((table) => !KEEP_TABLES.has(table));

    const targetUserCountRaw: unknown = await qr.query(
      `SELECT COUNT(*)::text AS count
       FROM "learning"."users"
       WHERE LOWER("email") = LOWER($1)`,
      [TARGET_ADMIN_EMAIL],
    );
    const targetUserCount = Number(
      Array.isArray(targetUserCountRaw) && targetUserCountRaw[0]
        ? (targetUserCountRaw[0] as CountRow).count
        : '0',
    );

    if (targetUserCount < 1) {
      throw new Error(
        `Khong tim thay tai khoan ${TARGET_ADMIN_EMAIL} trong bang users. Da dung de tranh xoa nham.`,
      );
    }

    await qr.startTransaction();
    await qr.query('SET LOCAL session_replication_role = replica');

    for (const table of tablesToDelete) {
      await qr.query(`DELETE FROM "learning"."${table}"`);
    }

    await qr.query(
      `DELETE FROM "learning"."users"
       WHERE LOWER("email") <> LOWER($1)`,
      [TARGET_ADMIN_EMAIL],
    );

    await qr.query(
      `UPDATE "learning"."users"
       SET "role" = 'admin',
           "status" = 'active',
           "emailVerified" = true,
           "updatedAt" = NOW()
       WHERE LOWER("email") = LOWER($1)`,
      [TARGET_ADMIN_EMAIL],
    );

    await qr.query('SET LOCAL session_replication_role = origin');
    await qr.commitTransaction();

    console.log('Da xoa du lieu theo dieu kien xong.\n');

    const verifyTargetUserRaw: unknown = await qr.query(
      `SELECT COUNT(*)::text AS count
       FROM "learning"."users"
       WHERE LOWER("email") = LOWER($1)`,
      [TARGET_ADMIN_EMAIL],
    );
    const verifyTargetUserCount = Number(
      Array.isArray(verifyTargetUserRaw) && verifyTargetUserRaw[0]
        ? (verifyTargetUserRaw[0] as CountRow).count
        : '0',
    );

    const verifyOtherUsersRaw: unknown = await qr.query(
      `SELECT COUNT(*)::text AS count
       FROM "learning"."users"
       WHERE LOWER("email") <> LOWER($1)`,
      [TARGET_ADMIN_EMAIL],
    );
    const verifyOtherUsersCount = Number(
      Array.isArray(verifyOtherUsersRaw) && verifyOtherUsersRaw[0]
        ? (verifyOtherUsersRaw[0] as CountRow).count
        : '0',
    );

    const categoryCountRaw: unknown = await qr.query(
      `SELECT COUNT(*)::text AS count FROM "learning"."categories"`,
    );
    const categoryCount = Number(
      Array.isArray(categoryCountRaw) && categoryCountRaw[0]
        ? (categoryCountRaw[0] as CountRow).count
        : '0',
    );

    let nonEmptyTables = 0;
    for (const table of tablesToDelete) {
      const countRaw: unknown = await qr.query(
        `SELECT COUNT(*)::text AS count FROM "learning"."${table}"`,
      );
      const count = Number(
        Array.isArray(countRaw) && countRaw[0] ? (countRaw[0] as CountRow).count : '0',
      );
      if (count > 0) {
        nonEmptyTables += 1;
        console.log(`Canh bao: bang ${table} con ${count} ban ghi.`);
      }
    }

    console.log('=== KET QUA KIEM TRA ===');
    console.log(`users voi email muc tieu: ${verifyTargetUserCount}`);
    console.log(`users khac email muc tieu: ${verifyOtherUsersCount}`);
    console.log(`so ban ghi categories: ${categoryCount}`);
    console.log(`so bang con du lieu ngoai users/categories: ${nonEmptyTables}`);

    if (
      verifyTargetUserCount === 1 &&
      verifyOtherUsersCount === 0 &&
      nonEmptyTables === 0
    ) {
      console.log('\nHoan tat: du lieu da duoc don theo dung yeu cau.');
    } else {
      console.log('\nCanh bao: ket qua chua dat dung 100% dieu kien, can xem lai log.');
      process.exitCode = 1;
    }
  } catch (error) {
    if (qr.isTransactionActive) {
      await qr.rollbackTransaction();
    }
    throw error;
  } finally {
    await qr.release();
    await AppDataSource.destroy();
  }
}

cleanupKeepAdminAndCategories().catch((error: unknown) => {
  console.error('Loi khi cleanup:', getErrorMessage(error));
  process.exit(1);
});
