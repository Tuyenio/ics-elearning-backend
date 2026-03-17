import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * New table to store extracted/compiled exams (separate from exam bank).
 * These records represent concrete exam instances generated from the bank.
 */
export class CreateExtractedExamsTable1740000000036
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid
          WHERE t.typname = 'extracted_exams_type_enum' AND n.nspname = 'learning'
        ) THEN
          CREATE TYPE "learning"."extracted_exams_type_enum" AS ENUM ('practice', 'official');
        END IF;
      END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid
          WHERE t.typname = 'extracted_exams_status_enum' AND n.nspname = 'learning'
        ) THEN
          CREATE TYPE "learning"."extracted_exams_status_enum" AS ENUM ('draft', 'pending', 'approved', 'rejected');
        END IF;
      END $$`,
    );

    // Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "learning"."extracted_exams" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar NOT NULL,
        "description" text,
        "type" "learning"."extracted_exams_type_enum" NOT NULL DEFAULT 'practice',
        "status" "learning"."extracted_exams_status_enum" NOT NULL DEFAULT 'approved',
        "questions" jsonb NOT NULL,
        "timeLimit" integer NOT NULL DEFAULT 60,
        "passingScore" integer NOT NULL DEFAULT 70,
        "maxAttempts" integer NOT NULL DEFAULT 3,
        "shuffleQuestions" boolean NOT NULL DEFAULT true,
        "shuffleAnswers" boolean NOT NULL DEFAULT false,
        "showCorrectAnswers" boolean NOT NULL DEFAULT true,
        "availableFrom" timestamptz,
        "availableUntil" timestamptz,
        "certificateTemplateId" uuid,
        "sourceExamId" uuid,
        "courseId" uuid NOT NULL,
        "teacherId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_extracted_exams_id" PRIMARY KEY ("id")
      )
    `);

    // FKs
    await queryRunner.query(
      `DO $$ BEGIN IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_extracted_exams_course'
      ) THEN ALTER TABLE "learning"."extracted_exams"
        ADD CONSTRAINT "FK_extracted_exams_course" FOREIGN KEY ("courseId") REFERENCES "learning"."courses"("id") ON DELETE CASCADE;
      END IF; END $$`,
    );

    await queryRunner.query(
      `DO $$ BEGIN IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_extracted_exams_teacher'
      ) THEN ALTER TABLE "learning"."extracted_exams"
        ADD CONSTRAINT "FK_extracted_exams_teacher" FOREIGN KEY ("teacherId") REFERENCES "learning"."users"("id") ON DELETE CASCADE;
      END IF; END $$`,
    );

    await queryRunner.query(
      `DO $$ BEGIN IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_extracted_exams_source_exam'
      ) THEN ALTER TABLE "learning"."extracted_exams"
        ADD CONSTRAINT "FK_extracted_exams_source_exam" FOREIGN KEY ("sourceExamId") REFERENCES "learning"."exams"("id") ON DELETE SET NULL;
      END IF; END $$`,
    );

    // Indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_extracted_exams_status" ON "learning"."extracted_exams" USING btree ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_extracted_exams_type" ON "learning"."extracted_exams" USING btree ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_extracted_exams_course" ON "learning"."extracted_exams" USING btree ("courseId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_extracted_exams_teacher" ON "learning"."extracted_exams" USING btree ("teacherId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "learning"."extracted_exams" CASCADE`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "learning"."extracted_exams_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "learning"."extracted_exams_type_enum"`,
    );
  }
}
