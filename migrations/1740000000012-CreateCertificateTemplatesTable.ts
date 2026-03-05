import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCertificateTemplatesTable1740000000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "certificate_templates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar NOT NULL,
        "description" text NOT NULL,
        "courseId" uuid NOT NULL,
        "teacherId" uuid NOT NULL,
        "validityPeriod" varchar NOT NULL DEFAULT 'Vĩnh viễn'::character varying,
        "backgroundColor" varchar NOT NULL DEFAULT '#1a1a2e'::character varying,
        "borderColor" varchar NOT NULL DEFAULT '#d4af37'::character varying,
        "borderStyle" varchar NOT NULL DEFAULT 'double'::character varying,
        "textColor" varchar NOT NULL DEFAULT '#ffffff'::character varying,
        "logoUrl" varchar,
        "signatureUrl" varchar,
        "templateImageUrl" varchar,
        "templateStyle" varchar NOT NULL DEFAULT 'classic'::character varying,
        "badgeStyle" varchar NOT NULL DEFAULT 'star'::character varying,
        "status" "certificate_templates_status_enum" NOT NULL DEFAULT 'draft'::certificate_templates_status_enum,
        "rejectionReason" text,
        "issuedCount" integer NOT NULL DEFAULT 0,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_certificate_templates_courseId') THEN ALTER TABLE \"certificate_templates\" ADD CONSTRAINT \"FK_certificate_templates_courseId\" FOREIGN KEY (\"courseId\") REFERENCES \"courses\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_certificate_templates_teacherId') THEN ALTER TABLE \"certificate_templates\" ADD CONSTRAINT \"FK_certificate_templates_teacherId\" FOREIGN KEY (\"teacherId\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_253123683aebda701e837e14cf" ON "certificate_templates" USING btree ("courseId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_9c65b7838cc185476945ae5d8f" ON "certificate_templates" USING btree ("teacherId")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "certificate_templates" CASCADE');
  }
}
