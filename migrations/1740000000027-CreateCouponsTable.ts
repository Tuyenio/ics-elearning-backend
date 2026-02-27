import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCouponsTable1740000000027 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "coupons" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" varchar NOT NULL,
        "type" "coupons_type_enum" NOT NULL DEFAULT 'percentage'::coupons_type_enum,
        "value" numeric NOT NULL,
        "min_purchase" numeric,
        "max_discount" numeric,
        "usage_limit" integer,
        "used_count" integer NOT NULL DEFAULT 0,
        "course_id" uuid,
        "created_by" uuid NOT NULL,
        "status" "coupons_status_enum" NOT NULL DEFAULT 'active'::coupons_status_enum,
        "valid_from" timestamp,
        "valid_until" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_coupons_code" ON "coupons" ("code")');
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_coupons_course_id') THEN ALTER TABLE \"coupons\" ADD CONSTRAINT \"FK_coupons_course_id\" FOREIGN KEY (\"course_id\") REFERENCES \"courses\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_coupons_created_by') THEN ALTER TABLE \"coupons\" ADD CONSTRAINT \"FK_coupons_created_by\" FOREIGN KEY (\"created_by\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_cbfc36859d6d455581303e8508" ON "coupons" USING btree (course_id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_dc1cf7573d95d72ac52fe10a97" ON "coupons" USING btree (created_by)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_ed793a952de93a5f8d5dfdace5" ON "coupons" USING btree (status)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_b8db82101e5aa99f402480de70" ON "coupons" USING btree (valid_from)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_a6bc1eaa0dcc36e7ba5d0cf7e5" ON "coupons" USING btree (valid_until)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "coupons" CASCADE');
  }
}
