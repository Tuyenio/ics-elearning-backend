import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeResourcesToJsonb1740000000026 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lessons' AND column_name = 'resources' AND data_type != 'jsonb'
        ) THEN
          ALTER TABLE "lessons" ALTER COLUMN "resources" TYPE jsonb USING "resources"::jsonb;
        END IF;
      END $$;
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
