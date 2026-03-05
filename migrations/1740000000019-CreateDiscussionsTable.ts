import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDiscussionsTable1740000000019 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "discussions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar NOT NULL,
        "content" text NOT NULL,
        "course_id" uuid NOT NULL,
        "lesson_id" uuid,
        "author_id" uuid NOT NULL,
        "parent_id" uuid,
        "is_pinned" boolean NOT NULL DEFAULT false,
        "is_resolved" boolean NOT NULL DEFAULT false,
        "reply_count" integer NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_discussions_lesson_id') THEN ALTER TABLE \"discussions\" ADD CONSTRAINT \"FK_discussions_lesson_id\" FOREIGN KEY (\"lesson_id\") REFERENCES \"lessons\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_discussions_course_id') THEN ALTER TABLE \"discussions\" ADD CONSTRAINT \"FK_discussions_course_id\" FOREIGN KEY (\"course_id\") REFERENCES \"courses\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_discussions_parent_id') THEN ALTER TABLE \"discussions\" ADD CONSTRAINT \"FK_discussions_parent_id\" FOREIGN KEY (\"parent_id\") REFERENCES \"discussions\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_discussions_author_id') THEN ALTER TABLE \"discussions\" ADD CONSTRAINT \"FK_discussions_author_id\" FOREIGN KEY (\"author_id\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_86f683d676a567be37cc9c06c8" ON "discussions" USING btree (course_id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_79212043b84fa5438c38ce1438" ON "discussions" USING btree (lesson_id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_cedb0b583906c7f01fc7bd4972" ON "discussions" USING btree (author_id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_a2559be8d2f054ea1ca1430229" ON "discussions" USING btree (parent_id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_17e3c64fa107ec738f0675f744" ON "discussions" USING btree (course_id, lesson_id)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "discussions" CASCADE');
  }
}
