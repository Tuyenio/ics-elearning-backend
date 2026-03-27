import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToScheduleItems1740000000042 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "learning"."schedule_items" ADD COLUMN IF NOT EXISTS "userId" uuid',
    );

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_schedule_items_userId" ON "learning"."schedule_items" ("userId")',
    );

    await queryRunner.query(
      "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_schedule_items_userId') THEN ALTER TABLE \"learning\".\"schedule_items\" ADD CONSTRAINT \"FK_schedule_items_userId\" FOREIGN KEY (\"userId\") REFERENCES \"learning\".\"users\"(\"id\") ON DELETE CASCADE; END IF; END $$",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "learning"."schedule_items" DROP CONSTRAINT IF EXISTS "FK_schedule_items_userId"',
    );

    await queryRunner.query(
      'DROP INDEX IF EXISTS "learning"."IDX_schedule_items_userId"',
    );

    await queryRunner.query(
      'ALTER TABLE "learning"."schedule_items" DROP COLUMN IF EXISTS "userId"',
    );
  }
}
