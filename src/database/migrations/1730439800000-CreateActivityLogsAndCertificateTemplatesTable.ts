import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateActivityLogsAndCertificateTemplatesTable1730439800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create activity_logs table
    await queryRunner.createTable(
      new Table({
        name: 'activity_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'action',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'entityType',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'entityId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'userRole',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create certificate_templates table
    await queryRunner.createTable(
      new Table({
        name: 'certificate_templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'templateType',
            type: 'enum',
            enum: ['course_completion', 'exam_completion', 'custom'],
            default: "'course_completion'",
          },
          {
            name: 'design',
            type: 'json',
            isNullable: false,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isDefault',
            type: 'boolean',
            default: false,
          },
          {
            name: 'previewUrl',
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

    // Create indexes for better query performance
    await queryRunner.query(
      'CREATE INDEX "IDX_activity_logs_userId" ON "activity_logs" ("userId")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_activity_logs_action" ON "activity_logs" ("action")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_activity_logs_entityType" ON "activity_logs" ("entityType")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('certificate_templates');
    await queryRunner.dropTable('activity_logs');
  }
}
