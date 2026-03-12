import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShuffleAnswersToExams1740000000033
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE learning.exams ADD COLUMN IF NOT EXISTS "shuffleAnswers" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE learning.exams DROP COLUMN IF EXISTS "shuffleAnswers"`,
    );
  }
}
