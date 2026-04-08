import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTitleAndTagsToNotes1740000000047 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'learning' AND table_name = 'notes'
        ) THEN
          ALTER TABLE "learning"."notes" ADD COLUMN IF NOT EXISTS "title" text;
          ALTER TABLE "learning"."notes" ADD COLUMN IF NOT EXISTS "tags" text[];
        ELSIF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'notes'
        ) THEN
          ALTER TABLE "public"."notes" ADD COLUMN IF NOT EXISTS "title" text;
          ALTER TABLE "public"."notes" ADD COLUMN IF NOT EXISTS "tags" text[];
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'learning' AND table_name = 'notes'
        ) THEN
          ALTER TABLE "learning"."notes" DROP COLUMN IF EXISTS "title";
          ALTER TABLE "learning"."notes" DROP COLUMN IF EXISTS "tags";
        ELSIF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'notes'
        ) THEN
          ALTER TABLE "public"."notes" DROP COLUMN IF EXISTS "title";
          ALTER TABLE "public"."notes" DROP COLUMN IF EXISTS "tags";
        END IF;
      END $$;
    `);
  }
}
