import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLessonsTable1740000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lessons" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar NOT NULL,
        "description" text,
        "type" "lessons_type_enum" NOT NULL DEFAULT 'video'::lessons_type_enum,
        "videoUrl" varchar,
        "videoThumbnail" varchar,
        "duration" integer NOT NULL DEFAULT 0,
        "content" text,
        "resources" text,
        "order" integer NOT NULL DEFAULT 0,
        "isFree" boolean NOT NULL DEFAULT false,
        "isPublished" boolean NOT NULL DEFAULT false,
        "courseId" uuid NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_lessons_courseId') THEN ALTER TABLE \"lessons\" ADD CONSTRAINT \"FK_lessons_courseId\" FOREIGN KEY (\"courseId\") REFERENCES \"courses\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_1a9ff2409a84c76560ae8a9259" ON "lessons" USING btree ("courseId")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "lessons" CASCADE');
  }
}
