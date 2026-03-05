import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResourcesTable1740000000025 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "resources" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar NOT NULL,
        "description" text,
        "type" "resources_type_enum" NOT NULL,
        "url" varchar,
        "file_path" varchar,
        "file_size" bigint,
        "course_id" uuid NOT NULL,
        "lesson_id" uuid,
        "uploaded_by" uuid NOT NULL,
        "download_count" integer NOT NULL DEFAULT 0,
        "is_public" boolean NOT NULL DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_resources_course_id') THEN ALTER TABLE \"resources\" ADD CONSTRAINT \"FK_resources_course_id\" FOREIGN KEY (\"course_id\") REFERENCES \"courses\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_resources_lesson_id') THEN ALTER TABLE \"resources\" ADD CONSTRAINT \"FK_resources_lesson_id\" FOREIGN KEY (\"lesson_id\") REFERENCES \"lessons\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_resources_uploaded_by') THEN ALTER TABLE \"resources\" ADD CONSTRAINT \"FK_resources_uploaded_by\" FOREIGN KEY (\"uploaded_by\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_65d16228cfa6e88403acc8d466" ON "resources" USING btree (course_id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_8f294aae89a7693f9cec1a6723" ON "resources" USING btree (lesson_id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_9cf8aa3e8c65a062c8634306fa" ON "resources" USING btree (uploaded_by)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "resources" CASCADE');
  }
}
