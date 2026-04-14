import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCouponApplyScopeTargets1740000000048
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "learning"."coupons"
      ADD COLUMN IF NOT EXISTS "apply_scope" varchar(20) NOT NULL DEFAULT 'all'
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."coupons"
      ADD COLUMN IF NOT EXISTS "teacher_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."coupons"
      ADD COLUMN IF NOT EXISTS "category_id" uuid
    `);

    await queryRunner.query(`
      UPDATE "learning"."coupons"
      SET "apply_scope" = CASE
        WHEN "course_id" IS NOT NULL THEN 'course'
        ELSE 'all'
      END
      WHERE "apply_scope" IS NULL OR "apply_scope" = '' OR "apply_scope" = 'all'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_coupons_apply_scope"
      ON "learning"."coupons" ("apply_scope")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_coupons_teacher_id"
      ON "learning"."coupons" ("teacher_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_coupons_category_id"
      ON "learning"."coupons" ("category_id")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_coupons_teacher_id'
        ) THEN
          ALTER TABLE "learning"."coupons"
          ADD CONSTRAINT "FK_coupons_teacher_id"
          FOREIGN KEY ("teacher_id") REFERENCES "learning"."users"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_coupons_category_id'
        ) THEN
          ALTER TABLE "learning"."coupons"
          ADD CONSTRAINT "FK_coupons_category_id"
          FOREIGN KEY ("category_id") REFERENCES "learning"."categories"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "learning"."coupons"
      DROP CONSTRAINT IF EXISTS "FK_coupons_category_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."coupons"
      DROP CONSTRAINT IF EXISTS "FK_coupons_teacher_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "learning"."IDX_coupons_category_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "learning"."IDX_coupons_teacher_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "learning"."IDX_coupons_apply_scope"
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."coupons"
      DROP COLUMN IF EXISTS "category_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."coupons"
      DROP COLUMN IF EXISTS "teacher_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."coupons"
      DROP COLUMN IF EXISTS "apply_scope"
    `);
  }
}
