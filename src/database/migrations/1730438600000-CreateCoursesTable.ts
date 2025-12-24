import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateCoursesTable1730438600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'courses',
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
            name: 'slug',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'shortDescription',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'thumbnail',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'previewVideo',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'discountPrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'level',
            type: 'enum',
            enum: ['beginner', 'intermediate', 'advanced', 'all_levels'],
            default: "'beginner'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'pending', 'published', 'archived'],
            default: "'draft'",
          },
          {
            name: 'duration',
            type: 'int',
            default: 0,
          },
          {
            name: 'requirements',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'outcomes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'enrollmentCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0,
          },
          {
            name: 'reviewCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'isFeatured',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isBestseller',
            type: 'boolean',
            default: false,
          },
          {
            name: 'teacherId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'categoryId',
            type: 'uuid',
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

    // Add foreign keys
    await queryRunner.createForeignKey(
      'courses',
      new TableForeignKey({
        columnNames: ['teacherId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'courses',
      new TableForeignKey({
        columnNames: ['categoryId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'categories',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('courses');
  }
}
