import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupNullStudentIds1738941177000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Delete notes with null studentId
    await queryRunner.query(`DELETE FROM "notes" WHERE "studentId" IS NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No rollback possible as we deleted data
  }
}
