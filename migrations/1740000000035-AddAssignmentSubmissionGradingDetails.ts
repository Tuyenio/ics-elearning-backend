import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssignmentSubmissionGradingDetails1740000000035
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE learning.assignment_submissions ADD COLUMN IF NOT EXISTS grading_details text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE learning.assignment_submissions DROP COLUMN IF EXISTS grading_details`,
    );
  }
}
