import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsersTable1730438400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'password',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'phone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'avatar',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['student', 'teacher', 'admin'],
            default: "'student'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'pending'],
            default: "'pending'",
          },
          {
            name: 'bio',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'dateOfBirth',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'emailVerificationToken',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'emailVerified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'emailVerifiedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'passwordResetToken',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'passwordResetExpires',
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

    // Enable UUID extension if not already enabled
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
