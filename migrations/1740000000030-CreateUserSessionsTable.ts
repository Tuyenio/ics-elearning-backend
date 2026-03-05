import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserSessionsTable1740000000030 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "token" varchar NOT NULL,
        "deviceInfo" varchar,
        "ipAddress" varchar,
        "location" varchar,
        "status" "user_sessions_status_enum" NOT NULL DEFAULT 'active'::user_sessions_status_enum,
        "expiresAt" timestamp NOT NULL,
        "lastActivityAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_user_sessions_userId') THEN ALTER TABLE \"user_sessions\" ADD CONSTRAINT \"FK_user_sessions_userId\" FOREIGN KEY (\"userId\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE; END IF; END $$");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "user_sessions" CASCADE');
  }
}
