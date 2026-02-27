import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTable1740000000023 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "type" "notifications_type_enum" NOT NULL,
        "title" varchar NOT NULL,
        "message" text NOT NULL,
        "link" varchar,
        "metadata" text,
        "status" "notifications_status_enum" NOT NULL DEFAULT 'unread'::notifications_status_enum,
        "readAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_notifications_userId') THEN ALTER TABLE \"notifications\" ADD CONSTRAINT \"FK_notifications_userId\" FOREIGN KEY (\"userId\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_692a909ee0fa9383e7859f9b40" ON "notifications" USING btree ("userId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_92f5d3a7779be163cbea7916c6" ON "notifications" USING btree (status)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_78207b2dc2b0d717649e89d3fc" ON "notifications" USING btree ("userId", status)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "notifications" CASCADE');
  }
}
