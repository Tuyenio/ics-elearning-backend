import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeResourcesToJsonb1740000000026 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "lessons"
      ALTER COLUMN "resources" TYPE jsonb
      USING "resources"::jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "lessons"
      ALTER COLUMN "resources" TYPE text
      USING "resources"::text;
    `);
  }
}
