import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateQuizAttemptsTable1740000000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quiz_attempts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "quizId" uuid NOT NULL,
        "answers" text,
        "score" numeric NOT NULL DEFAULT '0'::numeric,
        "passed" boolean NOT NULL DEFAULT false,
        "status" "quiz_attempts_status_enum" NOT NULL DEFAULT 'in_progress'::quiz_attempts_status_enum,
        "startedAt" timestamp,
        "completedAt" timestamp,
        "timeSpent" integer NOT NULL DEFAULT 0,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_quiz_attempts_quizId') THEN ALTER TABLE \"quiz_attempts\" ADD CONSTRAINT \"FK_quiz_attempts_quizId\" FOREIGN KEY (\"quizId\") REFERENCES \"quizzes\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_quiz_attempts_studentId') THEN ALTER TABLE \"quiz_attempts\" ADD CONSTRAINT \"FK_quiz_attempts_studentId\" FOREIGN KEY (\"studentId\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_30ae16bcedd2b2663686edfc7a" ON "quiz_attempts" USING btree ("studentId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_23f2bbe9288b221b1b37737278" ON "quiz_attempts" USING btree ("quizId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_f1bce034c61d74e1f4089f09ee" ON "quiz_attempts" USING btree (status)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "quiz_attempts" CASCADE');
  }
}
