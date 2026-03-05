import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCoursesTable1740000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "courses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar NOT NULL,
        "slug" varchar NOT NULL,
        "description" text NOT NULL,
        "shortDescription" text,
        "thumbnail" varchar,
        "previewVideo" varchar,
        "price" numeric NOT NULL DEFAULT '0'::numeric,
        "discountPrice" numeric NOT NULL DEFAULT '0'::numeric,
        "level" "courses_level_enum" NOT NULL DEFAULT 'beginner'::courses_level_enum,
        "status" "courses_status_enum" NOT NULL DEFAULT 'draft'::courses_status_enum,
        "rejectionReason" text,
        "duration" integer NOT NULL DEFAULT 0,
        "requirements" text,
        "outcomes" text,
        "tags" text,
        "enrollmentCount" integer NOT NULL DEFAULT 0,
        "rating" numeric NOT NULL DEFAULT '0'::numeric,
        "reviewCount" integer NOT NULL DEFAULT 0,
        "isFeatured" boolean NOT NULL DEFAULT false,
        "isBestseller" boolean NOT NULL DEFAULT false,
        "teacherId" uuid,
        "categoryId" uuid,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_courses_slug" ON "courses" ("slug")');
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_courses_categoryId') THEN ALTER TABLE \"courses\" ADD CONSTRAINT \"FK_courses_categoryId\" FOREIGN KEY (\"categoryId\") REFERENCES \"categories\"(\"id\") ON DELETE SET NULL; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_courses_teacherId') THEN ALTER TABLE \"courses\" ADD CONSTRAINT \"FK_courses_teacherId\" FOREIGN KEY (\"teacherId\") REFERENCES \"users\"(\"id\") ON DELETE SET NULL; END IF; END $$");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_f921bd9bb6d061b90d386fa372" ON "courses" USING btree ("teacherId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_c730473dfb837b3e62057cd944" ON "courses" USING btree ("categoryId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_889f2701163f86b2faf62a6247" ON "courses" USING btree (status)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_502e69f02ab55229854706b50c" ON "courses" USING btree ("isFeatured")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_d0cbe84b6054560cd1fae8693e" ON "courses" USING btree ("isBestseller")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "courses" CASCADE');
  }
}
