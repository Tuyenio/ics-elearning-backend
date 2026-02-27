import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAssignmentSubmissionsTable1740000000021 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "assignment_submissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "assignment_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "content" text,
        "attachments" text,
        "status" "assignment_submissions_status_enum" NOT NULL DEFAULT 'not_submitted'::assignment_submissions_status_enum,
        "score" integer,
        "feedback" text,
        "graded_by" uuid,
        "graded_at" timestamp,
        "submitted_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_assignment_submissions_assignment_id') THEN ALTER TABLE \"assignment_submissions\" ADD CONSTRAINT \"FK_assignment_submissions_assignment_id\" FOREIGN KEY (\"assignment_id\") REFERENCES \"assignments\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_assignment_submissions_graded_by') THEN ALTER TABLE \"assignment_submissions\" ADD CONSTRAINT \"FK_assignment_submissions_graded_by\" FOREIGN KEY (\"graded_by\") REFERENCES \"users\"(\"id\") ON DELETE SET NULL; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_assignment_submissions_student_id') THEN ALTER TABLE \"assignment_submissions\" ADD CONSTRAINT \"FK_assignment_submissions_student_id\" FOREIGN KEY (\"student_id\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE; END IF; END $$");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "assignment_submissions" CASCADE');
  }
}
