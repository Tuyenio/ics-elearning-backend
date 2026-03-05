import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategoriesTable1740000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "slug" varchar NOT NULL,
        "description" text,
        "icon" varchar,
        "image" varchar,
        "order" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_categories_slug" ON "categories" ("slug")');
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_categories_name" ON "categories" ("name")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_3a10aa36cee83153e97161ab26" ON "categories" USING btree ("order")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_77d4cad977bd471fb670059561" ON "categories" USING btree ("isActive")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "categories" CASCADE');
  }
}
