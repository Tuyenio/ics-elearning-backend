import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAssignmentsTable1740000000020 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "assignments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar NOT NULL,
        "description" text NOT NULL,
        "course_id" uuid NOT NULL,
        "lesson_id" uuid,
        "created_by" uuid NOT NULL,
        "max_score" integer NOT NULL DEFAULT 100,
        "due_date" timestamp,
        "status" "assignments_status_enum" NOT NULL DEFAULT 'draft'::assignments_status_enum,
        "allow_late_submission" boolean NOT NULL DEFAULT false,
        "instructions" text,
        "attachments" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_assignments_created_by') THEN ALTER TABLE \"assignments\" ADD CONSTRAINT \"FK_assignments_created_by\" FOREIGN KEY (\"created_by\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_assignments_course_id') THEN ALTER TABLE \"assignments\" ADD CONSTRAINT \"FK_assignments_course_id\" FOREIGN KEY (\"course_id\") REFERENCES \"courses\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_assignments_lesson_id') THEN ALTER TABLE \"assignments\" ADD CONSTRAINT \"FK_assignments_lesson_id\" FOREIGN KEY (\"lesson_id\") REFERENCES \"lessons\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_33f833f305070d2d4e6305d8a0" ON "assignments" USING btree (course_id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_c0fda9de424e0e719787f6b576" ON "assignments" USING btree (lesson_id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_03fa66c20619cbc55aa4ebc69b" ON "assignments" USING btree (created_by)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_d642b9992b07da1049da26758b" ON "assignments" USING btree (due_date)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_ce6063ba9705d8ce937dfee002" ON "assignments" USING btree (status)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "assignments" CASCADE');
  }
}
