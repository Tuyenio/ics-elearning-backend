import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTwoFactorAuthTable1740000000029 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "two_factor_auth" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "isEnabled" boolean NOT NULL DEFAULT false,
        "method" "two_factor_auth_method_enum" NOT NULL DEFAULT 'totp'::two_factor_auth_method_enum,
        "secret" varchar,
        "backupCodes" text,
        "phoneNumber" varchar,
        "isVerified" boolean NOT NULL DEFAULT false,
        "verifiedAt" timestamp,
        "lastUsedAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_two_factor_auth_userId" ON "two_factor_auth" ("userId")');
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_two_factor_auth_userId') THEN ALTER TABLE \"two_factor_auth\" ADD CONSTRAINT \"FK_two_factor_auth_userId\" FOREIGN KEY (\"userId\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE; END IF; END $$");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "two_factor_auth" CASCADE');
  }
}
