import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourseRevisionColumns1740000000043
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE learning.courses
      ADD COLUMN IF NOT EXISTS "sourceCourseId" uuid NULL
    `);

    await queryRunner.query(`
      ALTER TABLE learning.lessons
      ADD COLUMN IF NOT EXISTS "sourceLessonId" uuid NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_courses_sourceCourseId"
      ON learning.courses ("sourceCourseId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lessons_sourceLessonId"
      ON learning.lessons ("sourceLessonId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS learning."IDX_lessons_sourceLessonId"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS learning."IDX_courses_sourceCourseId"
    `);

    await queryRunner.query(`
      ALTER TABLE learning.lessons
      DROP COLUMN IF EXISTS "sourceLessonId"
    `);

    await queryRunner.query(`
      ALTER TABLE learning.courses
      DROP COLUMN IF EXISTS "sourceCourseId"
    `);
  }
}
