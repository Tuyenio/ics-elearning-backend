import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastLoginAtToUsers1740000000041 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "learning"."users" ADD COLUMN IF NOT EXISTS "lastLoginAt" timestamp',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "learning"."users" DROP COLUMN IF EXISTS "lastLoginAt"',
    );
  }
}
