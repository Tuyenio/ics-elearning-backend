import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSectionTitleToLessons1740000000030 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "learning"."lessons"
      ADD COLUMN IF NOT EXISTS "sectionTitle" varchar NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "learning"."lessons"
      DROP COLUMN IF EXISTS "sectionTitle"
    `);
  }
}
