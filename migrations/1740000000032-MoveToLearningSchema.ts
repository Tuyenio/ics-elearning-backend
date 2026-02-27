import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * This migration:
 * 1. Seeds migration records for all previous migrations (so they won't re-run on existing dev DB)
 * 2. Moves all existing tables from "public" schema to "learning" schema
 * 3. Moves all enum types from "public" to "learning" schema
 * 4. Sets the default search_path to include "learning"
 */
export class MoveToLearningSchema1740000000032 implements MigrationInterface {
  // All previous migrations that should be marked as already executed
  private previousMigrations = [
    { timestamp: 1740000000001, name: 'CreateExtensions1740000000001' },
    { timestamp: 1740000000002, name: 'CreateEnums1740000000002' },
    { timestamp: 1740000000003, name: 'CreateUsersTable1740000000003' },
    { timestamp: 1740000000004, name: 'CreateCategoriesTable1740000000004' },
    { timestamp: 1740000000005, name: 'CreateSystemSettingsTable1740000000005' },
    { timestamp: 1740000000006, name: 'CreateScheduleItemsTable1740000000006' },
    { timestamp: 1740000000007, name: 'CreateCoursesTable1740000000007' },
    { timestamp: 1740000000008, name: 'CreateLessonsTable1740000000008' },
    { timestamp: 1740000000009, name: 'CreateEnrollmentsTable1740000000009' },
    { timestamp: 1740000000010, name: 'CreateLessonProgressTable1740000000010' },
    { timestamp: 1740000000011, name: 'CreatePaymentsTable1740000000011' },
    { timestamp: 1740000000012, name: 'CreateCertificateTemplatesTable1740000000012' },
    { timestamp: 1740000000013, name: 'CreateCertificatesTable1740000000013' },
    { timestamp: 1740000000014, name: 'CreateQuizzesTable1740000000014' },
    { timestamp: 1740000000015, name: 'CreateQuizAttemptsTable1740000000015' },
    { timestamp: 1740000000016, name: 'CreateExamsTable1740000000016' },
    { timestamp: 1740000000017, name: 'CreateExamAttemptsTable1740000000017' },
    { timestamp: 1740000000018, name: 'CreateAnnouncementsTable1740000000018' },
    { timestamp: 1740000000019, name: 'CreateDiscussionsTable1740000000019' },
    { timestamp: 1740000000020, name: 'CreateAssignmentsTable1740000000020' },
    { timestamp: 1740000000021, name: 'CreateAssignmentSubmissionsTable1740000000021' },
    { timestamp: 1740000000022, name: 'CreateNotesTable1740000000022' },
    { timestamp: 1740000000023, name: 'CreateNotificationsTable1740000000023' },
    { timestamp: 1740000000024, name: 'CreateReviewsTable1740000000024' },
    { timestamp: 1740000000025, name: 'CreateResourcesTable1740000000025' },
    { timestamp: 1740000000026, name: 'CreateCartTable1740000000026' },
    { timestamp: 1740000000027, name: 'CreateCouponsTable1740000000027' },
    { timestamp: 1740000000028, name: 'CreateWishlistsTable1740000000028' },
    { timestamp: 1740000000029, name: 'CreateTwoFactorAuthTable1740000000029' },
    { timestamp: 1740000000030, name: 'CreateUserSessionsTable1740000000030' },
    { timestamp: 1740000000031, name: 'CreateLearningSchema1740000000031' },
  ];

  // All tables to move (excluding TypeORM's own "migrations" table)
  private tables = [
    'announcements',
    'assignment_submissions',
    'assignments',
    'cart',
    'categories',
    'certificate_templates',
    'certificates',
    'coupons',
    'courses',
    'discussions',
    'enrollments',
    'exam_attempts',
    'exams',
    'lesson_progress',
    'lessons',
    'notes',
    'notifications',
    'payments',
    'quiz_attempts',
    'quizzes',
    'resources',
    'reviews',
    'schedule_items',
    'system_settings',
    'two_factor_auth',
    'user_sessions',
    'users',
    'wishlists',
  ];

  // All enum types to move
  private enumTypes = [
    'announcements_priority_enum',
    'assignment_submissions_status_enum',
    'assignments_status_enum',
    'certificate_templates_status_enum',
    'certificates_status_enum',
    'coupons_status_enum',
    'coupons_type_enum',
    'courses_level_enum',
    'courses_status_enum',
    'enrollments_status_enum',
    'exam_attempts_status_enum',
    'exams_status_enum',
    'exams_type_enum',
    'lessons_type_enum',
    'notifications_status_enum',
    'notifications_type_enum',
    'payments_paymentmethod_enum',
    'payments_status_enum',
    'quiz_attempts_status_enum',
    'resources_type_enum',
    'two_factor_auth_method_enum',
    'user_sessions_status_enum',
    'users_role_enum',
    'users_status_enum',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Insert migration records for all previous migrations
    // This prevents them from running again on an existing dev database
    for (const m of this.previousMigrations) {
      const exists = await queryRunner.query(
        'SELECT 1 FROM "migrations" WHERE "name" = $1',
        [m.name],
      );
      if (exists.length === 0) {
        await queryRunner.query(
          'INSERT INTO "migrations" ("timestamp", "name") VALUES ($1, $2)',
          [m.timestamp, m.name],
        );
      }
    }

    // Step 2: Ensure learning schema exists
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "learning"');

    // Step 3: Move enum types to learning schema
    for (const enumType of this.enumTypes) {
      await queryRunner.query(
        "DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typname = '" +
          enumType +
          "' AND n.nspname = 'public') THEN ALTER TYPE \"public\".\"" +
          enumType +
          '" SET SCHEMA "learning"; END IF; END $$',
      );
    }

    // Step 4: Move tables to learning schema
    for (const table of this.tables) {
      await queryRunner.query(
        "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '" +
          table +
          "') THEN ALTER TABLE \"public\".\"" +
          table +
          '" SET SCHEMA "learning"; END IF; END $$',
      );
    }

    // Step 5: Set search_path to include learning schema
    // This ensures existing code works without schema-qualifying table names
    // Use EXCEPTION handler in case pooled connection doesn't allow ALTER DATABASE
    await queryRunner.query(
      "DO $$ BEGIN EXECUTE 'ALTER DATABASE ' || current_database() || ' SET search_path TO learning, public'; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Could not alter database search_path: %, using connection-level setting instead', SQLERRM; END $$",
    );
    // Also set for current session
    await queryRunner.query('SET search_path TO learning, public');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Move tables back to public
    for (const table of this.tables) {
      await queryRunner.query(
        "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'learning' AND table_name = '" +
          table +
          "') THEN ALTER TABLE \"learning\".\"" +
          table +
          '" SET SCHEMA "public"; END IF; END $$',
      );
    }

    // Move enum types back to public
    for (const enumType of this.enumTypes) {
      await queryRunner.query(
        "DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typname = '" +
          enumType +
          "' AND n.nspname = 'learning') THEN ALTER TYPE \"learning\".\"" +
          enumType +
          '" SET SCHEMA "public"; END IF; END $$',
      );
    }

    // Reset search_path
    await queryRunner.query(
      "DO $$ BEGIN EXECUTE 'ALTER DATABASE ' || current_database() || ' SET search_path TO public'; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Could not alter database search_path: %', SQLERRM; END $$",
    );
    await queryRunner.query('SET search_path TO public');

    // Remove seeded migration records
    for (const m of this.previousMigrations) {
      await queryRunner.query(
        'DELETE FROM "migrations" WHERE "name" = $1',
        [m.name],
      );
    }
  }
}
