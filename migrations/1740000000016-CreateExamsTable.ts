import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExamsTable1740000000016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "exams" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar NOT NULL,
        "description" text,
        "type" "exams_type_enum" NOT NULL DEFAULT 'practice'::exams_type_enum,
        "status" "exams_status_enum" NOT NULL DEFAULT 'draft'::exams_status_enum,
        "questions" text NOT NULL,
        "timeLimit" integer NOT NULL DEFAULT 60,
        "passingScore" integer NOT NULL DEFAULT 70,
        "maxAttempts" integer NOT NULL DEFAULT 3,
        "shuffleQuestions" boolean NOT NULL DEFAULT true,
        "showCorrectAnswers" boolean NOT NULL DEFAULT true,
        "certificateTemplateId" varchar,
        "rejectionReason" text,
        "courseId" uuid NOT NULL,
        "teacherId" uuid NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_exams_courseId') THEN ALTER TABLE \"exams\" ADD CONSTRAINT \"FK_exams_courseId\" FOREIGN KEY (\"courseId\") REFERENCES \"courses\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_exams_teacherId') THEN ALTER TABLE \"exams\" ADD CONSTRAINT \"FK_exams_teacherId\" FOREIGN KEY (\"teacherId\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_1ba8ab6cfb5f36d71ee2a64a96" ON "exams" USING btree (status)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_3dcd9199b8cd801383e623c3d1" ON "exams" USING btree ("courseId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_698b8b125b1bf0e0d4a38bee30" ON "exams" USING btree ("teacherId")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "exams" CASCADE');
  }
}
