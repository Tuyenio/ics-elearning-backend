import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateLessonsTable1730438700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'lessons',
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
            name: 'type',
            type: 'enum',
            enum: ['video', 'article', 'quiz', 'assignment', 'resource'],
            default: "'video'",
          },
          {
            name: 'videoUrl',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'videoThumbnail',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'duration',
            type: 'int',
            default: 0,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'resources',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'order',
            type: 'int',
            default: 0,
          },
          {
            name: 'isFree',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isPublished',
            type: 'boolean',
            default: false,
          },
          {
            name: 'courseId',
            type: 'uuid',
            isNullable: false,
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
      'lessons',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'courses',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('lessons');
  }
}
