import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateExamsAndAttemptsTable1730439400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create exams table
    await queryRunner.createTable(
      new Table({
        name: 'exams',
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
            name: 'teacherId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['practice', 'official'],
            default: "'practice'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'pending', 'approved', 'rejected'],
            default: "'draft'",
          },
          {
            name: 'questions',
            type: 'json',
            isNullable: false,
          },
          {
            name: 'duration',
            type: 'int',
            isNullable: false,
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
            name: 'startDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'endDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'showCorrectAnswers',
            type: 'boolean',
            default: false,
          },
          {
            name: 'certificateTemplateId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'rejectionReason',
            type: 'text',
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
      'exams',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'courses',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'exams',
      new TableForeignKey({
        columnNames: ['teacherId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create exam_attempts table
    await queryRunner.createTable(
      new Table({
        name: 'exam_attempts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'examId',
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
            name: 'certificateId',
            type: 'varchar',
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
      'exam_attempts',
      new TableForeignKey({
        columnNames: ['examId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'exams',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'exam_attempts',
      new TableForeignKey({
        columnNames: ['studentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'exam_attempts',
      new TableForeignKey({
        columnNames: ['enrollmentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'enrollments',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('exam_attempts');
    await queryRunner.dropTable('exams');
  }
}
