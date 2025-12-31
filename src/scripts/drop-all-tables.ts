import { DataSource } from 'typeorm';
import { exit } from 'process';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: 'postgresql://postgres.mmmhqscxluurkgudarcq:Minhlanhim1511@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres',
  synchronize: false,
  logging: true,
});

async function dropAllTables() {
  console.log('🗑️  BẮT ĐẦU XÓA TẤT CẢ CÁC BẢNG\n');
  console.log('⚠️  CẢNH BÁO: Thao tác này sẽ xóa toàn bộ dữ liệu!\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ Đã kết nối database\n');

    const queryRunner = AppDataSource.createQueryRunner();
    
    // Get all table names
    const tables = await queryRunner.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    console.log(`📊 Tìm thấy ${tables.length} bảng:\n`);
    tables.forEach((table: any) => {
      console.log(`   - ${table.tablename}`);
    });
    console.log('');

    // Drop all tables
    console.log('🗑️  Đang xóa các bảng...\n');
    
    for (const table of tables) {
      const tableName = table.tablename;
      try {
        await queryRunner.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
        console.log(`   ✓ Đã xóa: ${tableName}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`   ✗ Lỗi khi xóa ${tableName}:`, errorMessage);
      }
    }

    console.log('\n✅ ĐÃ XÓA TOÀN BỘ CÁC BẢNG THÀNH CÔNG!\n');

    await queryRunner.release();
    await AppDataSource.destroy();
    console.log('👋 Đã đóng kết nối database\n');

  } catch (error) {
    console.error('❌ Lỗi:', error);
    exit(1);
  }
}

dropAllTables();
