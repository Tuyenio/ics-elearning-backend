import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminAuditLogsTable1740000000046
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "learning"."admin_audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "action" varchar NOT NULL,
        "entityType" varchar NOT NULL,
        "entityId" varchar,
        "actorId" uuid,
        "actorEmail" varchar,
        "metadata" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_admin_audit_action" ON "learning"."admin_audit_logs" ("action")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_admin_audit_entity" ON "learning"."admin_audit_logs" ("entityType")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_admin_audit_entityId" ON "learning"."admin_audit_logs" ("entityId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_admin_audit_actorId" ON "learning"."admin_audit_logs" ("actorId")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "learning"."admin_audit_logs" CASCADE');
  }
}
