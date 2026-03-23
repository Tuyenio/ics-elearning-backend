import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExtractedExamAttemptsTable1740000000039
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "learning"."extracted_exam_attempts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "extractedExamId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "answers" jsonb,
        "questionResults" jsonb,
        "score" double precision NOT NULL DEFAULT 0,
        "earnedPoints" double precision NOT NULL DEFAULT 0,
        "totalPoints" double precision NOT NULL DEFAULT 0,
        "passed" boolean NOT NULL DEFAULT false,
        "submittedAt" timestamptz,
        "timeSpent" integer NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_extracted_exam_attempts_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `DO $$ BEGIN IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_extracted_exam_attempts_exam'
      ) THEN ALTER TABLE "learning"."extracted_exam_attempts"
        ADD CONSTRAINT "FK_extracted_exam_attempts_exam" FOREIGN KEY ("extractedExamId") REFERENCES "learning"."extracted_exams"("id") ON DELETE CASCADE;
      END IF; END $$`,
    );

    await queryRunner.query(
      `DO $$ BEGIN IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_extracted_exam_attempts_student'
      ) THEN ALTER TABLE "learning"."extracted_exam_attempts"
        ADD CONSTRAINT "FK_extracted_exam_attempts_student" FOREIGN KEY ("studentId") REFERENCES "learning"."users"("id") ON DELETE CASCADE;
      END IF; END $$`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_extracted_exam_attempts_exam" ON "learning"."extracted_exam_attempts" USING btree ("extractedExamId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_extracted_exam_attempts_student" ON "learning"."extracted_exam_attempts" USING btree ("studentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_extracted_exam_attempts_submitted_at" ON "learning"."extracted_exam_attempts" USING btree ("submittedAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "learning"."extracted_exam_attempts" CASCADE`,
    );
  }
}
