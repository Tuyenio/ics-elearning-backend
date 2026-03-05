import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentsTable1740000000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "transactionId" varchar NOT NULL,
        "studentId" uuid,
        "courseId" uuid,
        "amount" numeric NOT NULL,
        "discountAmount" numeric NOT NULL DEFAULT '0'::numeric,
        "finalAmount" numeric,
        "currency" varchar NOT NULL DEFAULT 'VND'::character varying,
        "status" "payments_status_enum" NOT NULL DEFAULT 'pending'::payments_status_enum,
        "paymentMethod" "payments_paymentmethod_enum" NOT NULL DEFAULT 'bank_transfer'::payments_paymentmethod_enum,
        "paymentGatewayId" varchar,
        "gatewayTransactionId" varchar,
        "metadata" text,
        "paidAt" timestamp,
        "failureReason" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_payments_transactionId" ON "payments" ("transactionId")');
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_payments_courseId') THEN ALTER TABLE \"payments\" ADD CONSTRAINT \"FK_payments_courseId\" FOREIGN KEY (\"courseId\") REFERENCES \"courses\"(\"id\") ON DELETE SET NULL; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_payments_studentId') THEN ALTER TABLE \"payments\" ADD CONSTRAINT \"FK_payments_studentId\" FOREIGN KEY (\"studentId\") REFERENCES \"users\"(\"id\") ON DELETE SET NULL; END IF; END $$");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_b2731e10aef7f886a08c552290" ON "payments" USING btree ("studentId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_00097d3b3147848e3585aabb43" ON "payments" USING btree ("courseId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_32b41cdb985a296213e9a928b5" ON "payments" USING btree (status)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "payments" CASCADE');
  }
}
