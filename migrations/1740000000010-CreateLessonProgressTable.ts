import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLessonProgressTable1740000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lesson_progress" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "enrollmentId" uuid NOT NULL,
        "lessonId" uuid NOT NULL,
        "isCompleted" boolean NOT NULL DEFAULT false,
        "progress" numeric NOT NULL DEFAULT '0'::numeric,
        "lastPosition" integer NOT NULL DEFAULT 0,
        "completedAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_lesson_progress_enrollmentId') THEN ALTER TABLE \"lesson_progress\" ADD CONSTRAINT \"FK_lesson_progress_enrollmentId\" FOREIGN KEY (\"enrollmentId\") REFERENCES \"enrollments\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_lesson_progress_lessonId') THEN ALTER TABLE \"lesson_progress\" ADD CONSTRAINT \"FK_lesson_progress_lessonId\" FOREIGN KEY (\"lessonId\") REFERENCES \"lessons\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_5bc4ad7572c19f8c12a67fee6b" ON "lesson_progress" USING btree ("enrollmentId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_df13299d2740b302dd44a368df" ON "lesson_progress" USING btree ("lessonId")');
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_36b8a65b9550e0b692d83da75e" ON "lesson_progress" USING btree ("enrollmentId", "lessonId")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "lesson_progress" CASCADE');
  }
}
