import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLearningSchema1740000000031 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "learning"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP SCHEMA IF EXISTS "learning" CASCADE');
  }
}
