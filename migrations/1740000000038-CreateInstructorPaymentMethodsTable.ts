import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInstructorPaymentMethodsTable1740000000038
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid
          WHERE t.typname = 'instructor_payment_methods_type_enum' AND n.nspname = 'learning'
        ) THEN
          CREATE TYPE "learning"."instructor_payment_methods_type_enum" AS ENUM ('bank_card', 'e_wallet');
        END IF;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "learning"."instructor_payment_methods" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "teacherId" uuid NOT NULL,
        "type" "learning"."instructor_payment_methods_type_enum" NOT NULL,
        "provider" varchar,
        "label" varchar NOT NULL,
        "cardLast4" varchar,
        "cardHolderName" varchar,
        "cardExpiry" varchar,
        "walletPhone" varchar,
        "isDefault" boolean NOT NULL DEFAULT false,
        "metadata" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_instructor_payment_methods_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_instructor_payment_methods_teacher" ON "learning"."instructor_payment_methods" ("teacherId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_instructor_payment_methods_type" ON "learning"."instructor_payment_methods" ("type")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_instructor_payment_methods_default" ON "learning"."instructor_payment_methods" ("isDefault")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_instructor_payment_methods_teacher'
        ) THEN
          ALTER TABLE "learning"."instructor_payment_methods"
            ADD CONSTRAINT "FK_instructor_payment_methods_teacher"
            FOREIGN KEY ("teacherId") REFERENCES "learning"."users"("id") ON DELETE CASCADE;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "learning"."instructor_payment_methods" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "learning"."instructor_payment_methods_type_enum"`);
  }
}
