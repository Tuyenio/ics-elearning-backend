import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnnouncementsTable1740000000018 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "announcements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" varchar NOT NULL,
        "content" text NOT NULL,
        "course_id" uuid,
        "author_id" uuid NOT NULL,
        "priority" "announcements_priority_enum" NOT NULL DEFAULT 'medium'::announcements_priority_enum,
        "is_pinned" boolean NOT NULL DEFAULT false,
        "is_published" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_announcements_author_id') THEN ALTER TABLE \"announcements\" ADD CONSTRAINT \"FK_announcements_author_id\" FOREIGN KEY (\"author_id\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_announcements_course_id') THEN ALTER TABLE \"announcements\" ADD CONSTRAINT \"FK_announcements_course_id\" FOREIGN KEY (\"course_id\") REFERENCES \"courses\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_e8f5ed3ae7b8b9e1f18fe9bb15" ON "announcements" USING btree (course_id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_0a13cf0aa1f1a2666699ff473f" ON "announcements" USING btree (author_id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_65c9e70d7b3e7fa38e12309808" ON "announcements" USING btree (is_pinned)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_84dd29edae1c7db1083e4cec08" ON "announcements" USING btree (is_published)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "announcements" CASCADE');
  }
}
