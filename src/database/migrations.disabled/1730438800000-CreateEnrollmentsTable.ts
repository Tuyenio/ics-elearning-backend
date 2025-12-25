import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateEnrollmentsTable1730438800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'enrollments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'studentId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'courseId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'completed', 'expired', 'cancelled'],
            default: "'active'",
          },
          {
            name: 'progress',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lastAccessedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'certificateIssued',
            type: 'boolean',
            default: false,
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
      'enrollments',
      new TableForeignKey({
        columnNames: ['studentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'enrollments',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'courses',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('enrollments');
  }
}
