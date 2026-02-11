import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNoteTypeAndItems1771062000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'notes',
      new TableColumn({
        name: 'type',
        type: 'varchar',
        default: "'general'",
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'notes',
      new TableColumn({
        name: 'items',
        type: 'json',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'notes',
      new TableColumn({
        name: 'schedule',
        type: 'json',
        isNullable: true,
      }),
    );

    // Make content nullable since not all note types need it
    await queryRunner.changeColumn(
      'notes',
      'content',
      new TableColumn({
        name: 'content',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('notes', 'schedule');
    await queryRunner.dropColumn('notes', 'items');
    await queryRunner.dropColumn('notes', 'type');

    await queryRunner.changeColumn(
      'notes',
      'content',
      new TableColumn({
        name: 'content',
        type: 'text',
        isNullable: false,
      }),
    );
  }
}
