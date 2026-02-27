import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReviewsTable1740000000024 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "courseId" uuid NOT NULL,
        "rating" integer NOT NULL,
        "comment" text,
        "isVerifiedPurchase" boolean NOT NULL DEFAULT false,
        "helpfulCount" integer NOT NULL DEFAULT 0,
        "isPublished" boolean NOT NULL DEFAULT true,
        "teacherReply" text,
        "repliedAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_reviews_courseId') THEN ALTER TABLE \"reviews\" ADD CONSTRAINT \"FK_reviews_courseId\" FOREIGN KEY (\"courseId\") REFERENCES \"courses\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_reviews_studentId') THEN ALTER TABLE \"reviews\" ADD CONSTRAINT \"FK_reviews_studentId\" FOREIGN KEY (\"studentId\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_63a921d8859a586e1fc91ff4f5" ON "reviews" USING btree ("studentId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_01ad76b89c3d4f612209556e2c" ON "reviews" USING btree ("courseId")');
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_9dc6cea0801d7e741404263db1" ON "reviews" USING btree ("studentId", "courseId")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "reviews" CASCADE');
  }
}
