import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExamAvailabilityWindow1740000000034
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE learning.exams ADD COLUMN IF NOT EXISTS "availableFrom" timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE learning.exams ADD COLUMN IF NOT EXISTS "availableUntil" timestamp NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_learning_exams_available_from" ON learning.exams ("availableFrom")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_learning_exams_available_until" ON learning.exams ("availableUntil")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_learning_exams_available_until"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_learning_exams_available_from"`,
    );
    await queryRunner.query(
      `ALTER TABLE learning.exams DROP COLUMN IF EXISTS "availableUntil"`,
    );
    await queryRunner.query(
      `ALTER TABLE learning.exams DROP COLUMN IF EXISTS "availableFrom"`,
    );
  }
}
