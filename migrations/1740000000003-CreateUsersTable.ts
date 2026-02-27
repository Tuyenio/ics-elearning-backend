import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1740000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" varchar NOT NULL,
        "password" varchar NOT NULL,
        "name" varchar NOT NULL,
        "phone" varchar,
        "avatar" varchar,
        "role" "users_role_enum" NOT NULL DEFAULT 'student'::users_role_enum,
        "status" "users_status_enum" NOT NULL DEFAULT 'pending'::users_status_enum,
        "bio" varchar,
        "dateOfBirth" date,
        "address" varchar,
        "emailVerificationToken" text,
        "emailVerified" boolean NOT NULL DEFAULT false,
        "emailVerifiedAt" timestamp,
        "passwordResetToken" text,
        "passwordResetExpires" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_email" ON "users" ("email")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_ace513fa30d485cfd25c11a9e4" ON "users" USING btree (role)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_3676155292d72c67cd4e090514" ON "users" USING btree (status)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "users" CASCADE');
  }
}
