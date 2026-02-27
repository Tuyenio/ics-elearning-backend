import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExamAttemptsTable1740000000017 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "exam_attempts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "examId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "answers" text,
        "score" double precision NOT NULL DEFAULT '0'::double precision,
        "earnedPoints" double precision NOT NULL DEFAULT '0'::double precision,
        "totalPoints" double precision NOT NULL DEFAULT '0'::double precision,
        "status" "exam_attempts_status_enum" NOT NULL DEFAULT 'in_progress'::exam_attempts_status_enum,
        "passed" boolean NOT NULL DEFAULT false,
        "certificateIssued" boolean NOT NULL DEFAULT false,
        "certificateId" varchar,
        "startedAt" timestamp NOT NULL,
        "completedAt" timestamp,
        "timeSpent" integer NOT NULL DEFAULT 0,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_exam_attempts_examId') THEN ALTER TABLE \"exam_attempts\" ADD CONSTRAINT \"FK_exam_attempts_examId\" FOREIGN KEY (\"examId\") REFERENCES \"exams\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_exam_attempts_studentId') THEN ALTER TABLE \"exam_attempts\" ADD CONSTRAINT \"FK_exam_attempts_studentId\" FOREIGN KEY (\"studentId\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_4eb0dd11d0191d842a8331e91d" ON "exam_attempts" USING btree ("examId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_b3cfd8fad204570a1d44884689" ON "exam_attempts" USING btree ("studentId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_3c879f018119b90478b258e674" ON "exam_attempts" USING btree (status)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "exam_attempts" CASCADE');
  }
}
