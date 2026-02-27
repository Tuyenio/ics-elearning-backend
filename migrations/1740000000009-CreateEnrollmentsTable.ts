import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEnrollmentsTable1740000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "enrollments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "courseId" uuid NOT NULL,
        "status" "enrollments_status_enum" NOT NULL DEFAULT 'active'::enrollments_status_enum,
        "progress" numeric NOT NULL DEFAULT '0'::numeric,
        "completedAt" timestamp,
        "expiresAt" timestamp,
        "lastAccessedAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_enrollments_courseId') THEN ALTER TABLE \"enrollments\" ADD CONSTRAINT \"FK_enrollments_courseId\" FOREIGN KEY (\"courseId\") REFERENCES \"courses\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_enrollments_studentId') THEN ALTER TABLE \"enrollments\" ADD CONSTRAINT \"FK_enrollments_studentId\" FOREIGN KEY (\"studentId\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_bf3ba3dfa95e2df7388eb4589f" ON "enrollments" USING btree ("studentId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_60dd0ae4e21002e63a5fdefeec" ON "enrollments" USING btree ("courseId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_3816714ab4c719d70e6b848744" ON "enrollments" USING btree (status)');
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_1566a16b6323a3e3ade31a02c9" ON "enrollments" USING btree ("studentId", "courseId")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "enrollments" CASCADE');
  }
}
