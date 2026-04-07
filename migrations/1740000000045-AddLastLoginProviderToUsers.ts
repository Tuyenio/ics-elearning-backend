import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastLoginProviderToUsers1740000000045
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "learning"."users" ADD COLUMN IF NOT EXISTS "lastLoginProvider" varchar',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "learning"."users" DROP COLUMN IF EXISTS "lastLoginProvider"',
    );
  }
}
