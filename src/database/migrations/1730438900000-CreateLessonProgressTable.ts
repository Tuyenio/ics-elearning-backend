import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateLessonProgressTable1730438900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'lesson_progress',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'enrollmentId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'lessonId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'progress',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'lastPosition',
            type: 'int',
            default: 0,
          },
          {
            name: 'isCompleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'timeSpent',
            type: 'int',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'lesson_progress',
      new TableForeignKey({
        columnNames: ['enrollmentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'enrollments',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'lesson_progress',
      new TableForeignKey({
        columnNames: ['lessonId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'lessons',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('lesson_progress');
  }
}
