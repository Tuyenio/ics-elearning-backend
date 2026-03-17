import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInstructorSubscriptionsTables1740000000037
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "learning"."instructor_plans" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "price" numeric(10,2) NOT NULL DEFAULT 0,
        "durationMonths" integer NOT NULL DEFAULT 1,
        "courseLimit" integer NOT NULL DEFAULT 2,
        "storageLimitGb" integer,
        "studentsLimit" integer,
        "features" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_instructor_plans_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_instructor_plans_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid
          WHERE t.typname = 'instructor_subscriptions_status_enum' AND n.nspname = 'learning'
        ) THEN
          CREATE TYPE "learning"."instructor_subscriptions_status_enum" AS ENUM ('active', 'pending', 'cancelled', 'expired');
        END IF;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "learning"."instructor_subscriptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "teacherId" uuid NOT NULL,
        "planId" uuid NOT NULL,
        "status" "learning"."instructor_subscriptions_status_enum" NOT NULL DEFAULT 'active',
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,
        "autoRenew" boolean NOT NULL DEFAULT false,
        "paymentMethod" varchar,
        "cancelReason" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_instructor_subscriptions_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid
          WHERE t.typname = 'instructor_subscription_payments_status_enum' AND n.nspname = 'learning'
        ) THEN
          CREATE TYPE "learning"."instructor_subscription_payments_status_enum" AS ENUM ('paid', 'pending', 'refunded', 'failed');
        END IF;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "learning"."instructor_subscription_payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "transactionId" varchar NOT NULL,
        "teacherId" uuid NOT NULL,
        "planId" uuid NOT NULL,
        "subscriptionId" uuid,
        "amount" numeric(10,2) NOT NULL DEFAULT 0,
        "currency" varchar NOT NULL DEFAULT 'USD',
        "status" "learning"."instructor_subscription_payments_status_enum" NOT NULL DEFAULT 'paid',
        "paymentMethod" varchar,
        "paidAt" TIMESTAMP,
        "metadata" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_instructor_subscription_payments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_instructor_subscription_payments_tx" UNIQUE ("transactionId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_instructor_plans_name" ON "learning"."instructor_plans" ("name")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_instructor_subscriptions_teacher" ON "learning"."instructor_subscriptions" ("teacherId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_instructor_subscriptions_plan" ON "learning"."instructor_subscriptions" ("planId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_instructor_subscriptions_status" ON "learning"."instructor_subscriptions" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_instructor_subscription_payments_tx" ON "learning"."instructor_subscription_payments" ("transactionId")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_instructor_subscriptions_teacher'
        ) THEN
          ALTER TABLE "learning"."instructor_subscriptions"
            ADD CONSTRAINT "FK_instructor_subscriptions_teacher"
            FOREIGN KEY ("teacherId") REFERENCES "learning"."users"("id") ON DELETE CASCADE;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_instructor_subscriptions_plan'
        ) THEN
          ALTER TABLE "learning"."instructor_subscriptions"
            ADD CONSTRAINT "FK_instructor_subscriptions_plan"
            FOREIGN KEY ("planId") REFERENCES "learning"."instructor_plans"("id") ON DELETE RESTRICT;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_instructor_subscription_payments_teacher'
        ) THEN
          ALTER TABLE "learning"."instructor_subscription_payments"
            ADD CONSTRAINT "FK_instructor_subscription_payments_teacher"
            FOREIGN KEY ("teacherId") REFERENCES "learning"."users"("id") ON DELETE CASCADE;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_instructor_subscription_payments_plan'
        ) THEN
          ALTER TABLE "learning"."instructor_subscription_payments"
            ADD CONSTRAINT "FK_instructor_subscription_payments_plan"
            FOREIGN KEY ("planId") REFERENCES "learning"."instructor_plans"("id") ON DELETE RESTRICT;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_instructor_subscription_payments_subscription'
        ) THEN
          ALTER TABLE "learning"."instructor_subscription_payments"
            ADD CONSTRAINT "FK_instructor_subscription_payments_subscription"
            FOREIGN KEY ("subscriptionId") REFERENCES "learning"."instructor_subscriptions"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      INSERT INTO "learning"."instructor_plans"
        ("name", "price", "durationMonths", "courseLimit", "storageLimitGb", "studentsLimit", "features", "isActive")
      VALUES
        ('Free', 0, 1, 2, 2, 200, '["2 khoa hoc","Thong ke co ban"]', true),
        ('Basic', 9, 1, 20, 10, 120, '["20 khoa hoc","10GB storage","Bao cao nang cao"]', true),
        ('Pro', 19, 1, 50, 50, NULL, '["50 khoa hoc","50GB storage","Hoc vien khong gioi han"]', true),
        ('Enterprise', 49, 1, 500, 500, NULL, '["Quy mo lon","Ho tro uu tien"]', true)
      ON CONFLICT ("name") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "learning"."instructor_subscription_payments" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "learning"."instructor_subscriptions" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "learning"."instructor_plans" CASCADE`,
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS "learning"."instructor_subscription_payments_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "learning"."instructor_subscriptions_status_enum"`,
    );
  }
}
