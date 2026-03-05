import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExtensions1740000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create learning schema first so search_path works correctly
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "learning"');
    // Create uuid-ossp extension
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP EXTENSION IF EXISTS "uuid-ossp"');
  }
}
