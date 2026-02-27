import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCartTable1740000000026 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cart" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "course_id" uuid NOT NULL,
        "price" numeric,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_cart_course_id') THEN ALTER TABLE \"cart\" ADD CONSTRAINT \"FK_cart_course_id\" FOREIGN KEY (\"course_id\") REFERENCES \"courses\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_cart_user_id') THEN ALTER TABLE \"cart\" ADD CONSTRAINT \"FK_cart_user_id\" FOREIGN KEY (\"user_id\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_f091e86a234693a49084b4c2c8" ON "cart" USING btree (user_id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_ccbdf937aeec8a8e8fb3c454d6" ON "cart" USING btree (course_id)');
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_600e91deee5626edd37578886c" ON "cart" USING btree (user_id, course_id)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "cart" CASCADE');
  }
}
