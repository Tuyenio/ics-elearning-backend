import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCertificatesTable1740000000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "certificates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "certificateNumber" varchar NOT NULL,
        "studentId" uuid NOT NULL,
        "courseId" uuid NOT NULL,
        "enrollmentId" uuid NOT NULL,
        "issueDate" timestamp NOT NULL,
        "pdfUrl" varchar,
        "imageUrl" varchar,
        "metadata" text,
        "status" "certificates_status_enum" NOT NULL DEFAULT 'approved'::certificates_status_enum,
        "rejectionReason" text,
        "shareId" varchar,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_certificates_enrollmentId" ON "certificates" ("enrollmentId")');
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_certificates_certificateNumber" ON "certificates" ("certificateNumber")');
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_certificates_enrollmentId') THEN ALTER TABLE \"certificates\" ADD CONSTRAINT \"FK_certificates_enrollmentId\" FOREIGN KEY (\"enrollmentId\") REFERENCES \"enrollments\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_certificates_studentId') THEN ALTER TABLE \"certificates\" ADD CONSTRAINT \"FK_certificates_studentId\" FOREIGN KEY (\"studentId\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_certificates_courseId') THEN ALTER TABLE \"certificates\" ADD CONSTRAINT \"FK_certificates_courseId\" FOREIGN KEY (\"courseId\") REFERENCES \"courses\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "REL_23287b04f9c0072b935a2abd6f" ON "certificates" USING btree ("enrollmentId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_dd01ec6501540780943fe16cf7" ON "certificates" USING btree ("studentId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_e50e73bc3bdcfb0eb3d561f149" ON "certificates" USING btree ("courseId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_23287b04f9c0072b935a2abd6f" ON "certificates" USING btree ("enrollmentId")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "certificates" CASCADE');
  }
}
