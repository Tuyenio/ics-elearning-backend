import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateNotificationsTable1730439700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'course_enrolled',
              'course_completed',
              'certificate_issued',
              'payment_success',
              'payment_failed',
              'exam_reminder',
              'exam_result',
              'course_approved',
              'course_rejected',
              'new_review',
              'new_student',
              'system_announcement',
              'promotion',
            ],
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'message',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'data',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['unread', 'read', 'archived'],
            default: "'unread'",
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['low', 'medium', 'high'],
            default: "'medium'",
          },
          {
            name: 'link',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'readAt',
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
      'notifications',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notifications');
  }
}
