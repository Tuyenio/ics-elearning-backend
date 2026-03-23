import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVariantsToExtractedExam1740000000040 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE learning.extracted_exams
        ADD COLUMN IF NOT EXISTS "variantCount" int NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "variants" jsonb;
    `);

    await queryRunner.query(`
      ALTER TABLE learning.extracted_exam_attempts
        ADD COLUMN IF NOT EXISTS "variantCode" int;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE learning.extracted_exams
        DROP COLUMN IF EXISTS "variantCount",
        DROP COLUMN IF EXISTS "variants";
    `);

    await queryRunner.query(`
      ALTER TABLE learning.extracted_exam_attempts
        DROP COLUMN IF EXISTS "variantCode";
    `);
  }
}
