import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateQuizzesTable1740000000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quizzes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" varchar NOT NULL,
        "description" text,
        "questions" text NOT NULL,
        "timeLimit" integer NOT NULL DEFAULT 60,
        "passingScore" integer NOT NULL DEFAULT 70,
        "maxAttempts" integer NOT NULL DEFAULT 3,
        "showCorrectAnswers" boolean NOT NULL DEFAULT true,
        "shuffleQuestions" boolean NOT NULL DEFAULT false,
        "courseId" uuid NOT NULL,
        "lessonId" uuid,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_quizzes_courseId') THEN ALTER TABLE \"quizzes\" ADD CONSTRAINT \"FK_quizzes_courseId\" FOREIGN KEY (\"courseId\") REFERENCES \"courses\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_quizzes_lessonId') THEN ALTER TABLE \"quizzes\" ADD CONSTRAINT \"FK_quizzes_lessonId\" FOREIGN KEY (\"lessonId\") REFERENCES \"lessons\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_9021b7e89ea353c02a361a10b7" ON "quizzes" USING btree ("courseId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_eba9ff0775c843581aab6916b3" ON "quizzes" USING btree ("lessonId")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "quizzes" CASCADE');
  }
}
