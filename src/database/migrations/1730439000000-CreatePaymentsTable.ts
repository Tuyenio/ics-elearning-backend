import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreatePaymentsTable1730439000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'payments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'transactionId',
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
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'discountAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'finalAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'currency',
            type: 'varchar',
            default: "'VND'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
            default: "'pending'",
          },
          {
            name: 'paymentMethod',
            type: 'enum',
            enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'wallet', 'qr_code'],
            isNullable: true,
          },
          {
            name: 'paymentGateway',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'gatewayTransactionId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'gatewayResponse',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'paidAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'refundedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'notes',
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
      'payments',
      new TableForeignKey({
        columnNames: ['studentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'courses',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('payments');
  }
}
