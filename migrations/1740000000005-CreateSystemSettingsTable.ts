import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSystemSettingsTable1740000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "system_settings_id_seq"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "id" integer NOT NULL DEFAULT nextval('system_settings_id_seq'::regclass),
        "key" varchar NOT NULL,
        "value" text,
        "site_logo" varchar,
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_system_settings_key" ON "system_settings" ("key")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "system_settings" CASCADE');
  }
}
