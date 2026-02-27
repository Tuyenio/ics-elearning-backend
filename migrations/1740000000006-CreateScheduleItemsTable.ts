import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScheduleItemsTable1740000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "schedule_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" varchar NOT NULL,
        "course" varchar NOT NULL,
        "type" varchar NOT NULL,
        "status" varchar NOT NULL,
        "time" varchar NOT NULL,
        "duration" varchar NOT NULL,
        "dueDate" varchar,
        "completed" boolean NOT NULL DEFAULT false,
        "important" boolean,
        "description" text,
        "tags" json,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "schedule_items" CASCADE');
  }
}
