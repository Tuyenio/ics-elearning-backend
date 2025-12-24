import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateCertificatesTable1730439100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'certificates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'certificateNumber',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
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
            name: 'enrollmentId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'issueDate',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'pdfUrl',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'imageUrl',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
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
      'certificates',
      new TableForeignKey({
        columnNames: ['studentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'certificates',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'courses',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'certificates',
      new TableForeignKey({
        columnNames: ['enrollmentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'enrollments',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('certificates');
  }
}
