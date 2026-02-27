import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotesTable1740000000022 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "studentId" uuid,
        "courseId" uuid,
        "lessonId" uuid,
        "type" varchar NOT NULL DEFAULT 'general'::character varying,
        "content" text,
        "timestamp" integer NOT NULL DEFAULT 0,
        "items" json,
        "schedule" json,
        "isFavorite" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_notes_lessonId') THEN ALTER TABLE \"notes\" ADD CONSTRAINT \"FK_notes_lessonId\" FOREIGN KEY (\"lessonId\") REFERENCES \"lessons\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_notes_courseId') THEN ALTER TABLE \"notes\" ADD CONSTRAINT \"FK_notes_courseId\" FOREIGN KEY (\"courseId\") REFERENCES \"courses\"(\"id\") ON DELETE NO ACTION; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_notes_studentId') THEN ALTER TABLE \"notes\" ADD CONSTRAINT \"FK_notes_studentId\" FOREIGN KEY (\"studentId\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE; END IF; END $$");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "notes" CASCADE');
  }
}
