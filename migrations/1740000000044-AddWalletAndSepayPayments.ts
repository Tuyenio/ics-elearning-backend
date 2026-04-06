import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletAndSepayPayments1740000000044
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'payments_paymenttype_enum'
            AND n.nspname = 'learning'
        ) THEN
          CREATE TYPE "learning"."payments_paymenttype_enum" AS ENUM ('course_enrollment', 'wallet_topup');
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'payments_status_enum'
            AND n.nspname = 'learning'
        ) AND NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'payments_status_enum'
            AND n.nspname = 'learning'
            AND e.enumlabel = 'expired'
        ) THEN
          ALTER TYPE "learning"."payments_status_enum" ADD VALUE 'expired';
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'payments_paymentmethod_enum'
            AND n.nspname = 'learning'
        ) AND NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'payments_paymentmethod_enum'
            AND n.nspname = 'learning'
            AND e.enumlabel = 'sepay_qr'
        ) THEN
          ALTER TYPE "learning"."payments_paymentmethod_enum" ADD VALUE 'sepay_qr';
        END IF;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."payments"
      ADD COLUMN IF NOT EXISTS "paymentType" "learning"."payments_paymenttype_enum" NOT NULL DEFAULT 'course_enrollment'
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."payments"
      ADD COLUMN IF NOT EXISTS "transactionCode" varchar
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."payments"
      ADD COLUMN IF NOT EXISTS "expiresAt" timestamp
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."payments"
      ADD COLUMN IF NOT EXISTS "webhookProcessedAt" timestamp
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."payments"
      ADD COLUMN IF NOT EXISTS "sepayTransactionId" varchar
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_payments_transactionCode"
      ON "learning"."payments" ("transactionCode")
      WHERE "transactionCode" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payments_paymentType"
      ON "learning"."payments" ("paymentType")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payments_expiresAt"
      ON "learning"."payments" ("expiresAt")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "learning"."user_wallets" (
        "id" SERIAL NOT NULL,
        "userId" uuid NOT NULL,
        "balance" numeric(18,2) NOT NULL DEFAULT 0,
        "currency" varchar(3) NOT NULL DEFAULT 'VND',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_wallets_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_wallets_userId" UNIQUE ("userId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_wallets_userId"
      ON "learning"."user_wallets" ("userId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "learning"."wallet_transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "walletId" integer NOT NULL,
        "paymentId" uuid,
        "instructorSubscriptionPaymentId" uuid,
        "changeAmount" numeric(18,2) NOT NULL,
        "balanceAfter" numeric(18,2) NOT NULL,
        "type" varchar(50) NOT NULL,
        "description" text,
        "metadata" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallet_transactions_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_walletId"
      ON "learning"."wallet_transactions" ("walletId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_paymentId"
      ON "learning"."wallet_transactions" ("paymentId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_instructorSubscriptionPaymentId"
      ON "learning"."wallet_transactions" ("instructorSubscriptionPaymentId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_type"
      ON "learning"."wallet_transactions" ("type")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_user_wallets_user'
        ) THEN
          ALTER TABLE "learning"."user_wallets"
          ADD CONSTRAINT "FK_user_wallets_user"
          FOREIGN KEY ("userId") REFERENCES "learning"."users"("id") ON DELETE CASCADE;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_wallet_transactions_wallet'
        ) THEN
          ALTER TABLE "learning"."wallet_transactions"
          ADD CONSTRAINT "FK_wallet_transactions_wallet"
          FOREIGN KEY ("walletId") REFERENCES "learning"."user_wallets"("id") ON DELETE CASCADE;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_wallet_transactions_payment'
        ) THEN
          ALTER TABLE "learning"."wallet_transactions"
          ADD CONSTRAINT "FK_wallet_transactions_payment"
          FOREIGN KEY ("paymentId") REFERENCES "learning"."payments"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_wallet_transactions_instructor_payment'
        ) THEN
          ALTER TABLE "learning"."wallet_transactions"
          ADD CONSTRAINT "FK_wallet_transactions_instructor_payment"
          FOREIGN KEY ("instructorSubscriptionPaymentId") REFERENCES "learning"."instructor_subscription_payments"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'instructor_subscription_payments_status_enum'
            AND n.nspname = 'learning'
        ) AND NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'instructor_subscription_payments_status_enum'
            AND n.nspname = 'learning'
            AND e.enumlabel = 'expired'
        ) THEN
          ALTER TYPE "learning"."instructor_subscription_payments_status_enum" ADD VALUE 'expired';
        END IF;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."instructor_subscription_payments"
      ADD COLUMN IF NOT EXISTS "expiresAt" timestamp
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."instructor_subscription_payments"
      ADD COLUMN IF NOT EXISTS "webhookProcessedAt" timestamp
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."instructor_subscription_payments"
      ADD COLUMN IF NOT EXISTS "sepayTransactionId" varchar
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "learning"."instructor_subscription_payments"
      DROP COLUMN IF EXISTS "sepayTransactionId"
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."instructor_subscription_payments"
      DROP COLUMN IF EXISTS "webhookProcessedAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."instructor_subscription_payments"
      DROP COLUMN IF EXISTS "expiresAt"
    `);

    await queryRunner.query('DROP TABLE IF EXISTS "learning"."wallet_transactions" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "learning"."user_wallets" CASCADE');

    await queryRunner.query('DROP INDEX IF EXISTS "learning"."IDX_payments_expiresAt"');
    await queryRunner.query('DROP INDEX IF EXISTS "learning"."IDX_payments_paymentType"');
    await queryRunner.query('DROP INDEX IF EXISTS "learning"."UQ_payments_transactionCode"');

    await queryRunner.query(`
      ALTER TABLE "learning"."payments"
      DROP COLUMN IF EXISTS "sepayTransactionId"
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."payments"
      DROP COLUMN IF EXISTS "webhookProcessedAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."payments"
      DROP COLUMN IF EXISTS "expiresAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."payments"
      DROP COLUMN IF EXISTS "transactionCode"
    `);

    await queryRunner.query(`
      ALTER TABLE "learning"."payments"
      DROP COLUMN IF EXISTS "paymentType"
    `);

    await queryRunner.query('DROP TYPE IF EXISTS "learning"."payments_paymenttype_enum"');
  }
}
