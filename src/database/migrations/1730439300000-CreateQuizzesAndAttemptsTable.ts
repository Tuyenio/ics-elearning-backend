import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateQuizzesAndAttemptsTable1730439300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create quizzes table
    await queryRunner.createTable(
      new Table({
        name: 'quizzes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'courseId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'lessonId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'questions',
            type: 'json',
            isNullable: false,
          },
          {
            name: 'timeLimit',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'passingScore',
            type: 'int',
            default: 70,
          },
          {
            name: 'maxAttempts',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'isPublished',
            type: 'boolean',
            default: false,
          },
          {
            name: 'order',
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
      'quizzes',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'courses',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'quizzes',
      new TableForeignKey({
        columnNames: ['lessonId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'lessons',
        onDelete: 'CASCADE',
      }),
    );

    // Create quiz_attempts table
    await queryRunner.createTable(
      new Table({
        name: 'quiz_attempts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'quizId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'studentId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'enrollmentId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'answers',
            type: 'json',
            isNullable: false,
          },
          {
            name: 'score',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'passed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'timeSpent',
            type: 'int',
            default: 0,
          },
          {
            name: 'startedAt',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
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
      'quiz_attempts',
      new TableForeignKey({
        columnNames: ['quizId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'quizzes',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'quiz_attempts',
      new TableForeignKey({
        columnNames: ['studentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'quiz_attempts',
      new TableForeignKey({
        columnNames: ['enrollmentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'enrollments',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('quiz_attempts');
    await queryRunner.dropTable('quizzes');
  }
}
