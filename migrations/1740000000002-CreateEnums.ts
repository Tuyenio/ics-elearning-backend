import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEnums1740000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'announcements_priority_enum') THEN CREATE TYPE \"announcements_priority_enum\" AS ENUM('low', 'medium', 'high', 'urgent'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_submissions_status_enum') THEN CREATE TYPE \"assignment_submissions_status_enum\" AS ENUM('not_submitted', 'submitted', 'graded', 'late'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignments_status_enum') THEN CREATE TYPE \"assignments_status_enum\" AS ENUM('draft', 'published', 'closed'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'certificate_templates_status_enum') THEN CREATE TYPE \"certificate_templates_status_enum\" AS ENUM('draft', 'pending', 'approved', 'rejected'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'certificates_status_enum') THEN CREATE TYPE \"certificates_status_enum\" AS ENUM('approved', 'pending', 'rejected'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coupons_status_enum') THEN CREATE TYPE \"coupons_status_enum\" AS ENUM('active', 'inactive', 'expired'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coupons_type_enum') THEN CREATE TYPE \"coupons_type_enum\" AS ENUM('percentage', 'fixed'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'courses_level_enum') THEN CREATE TYPE \"courses_level_enum\" AS ENUM('beginner', 'intermediate', 'advanced', 'all_levels'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'courses_status_enum') THEN CREATE TYPE \"courses_status_enum\" AS ENUM('draft', 'pending', 'published', 'rejected', 'archived'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enrollments_status_enum') THEN CREATE TYPE \"enrollments_status_enum\" AS ENUM('active', 'completed', 'expired', 'cancelled'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exam_attempts_status_enum') THEN CREATE TYPE \"exam_attempts_status_enum\" AS ENUM('in_progress', 'completed', 'timed_out'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exams_status_enum') THEN CREATE TYPE \"exams_status_enum\" AS ENUM('draft', 'pending', 'approved', 'rejected'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exams_type_enum') THEN CREATE TYPE \"exams_type_enum\" AS ENUM('practice', 'official'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lessons_type_enum') THEN CREATE TYPE \"lessons_type_enum\" AS ENUM('video', 'article', 'quiz', 'assignment', 'resource'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notifications_status_enum') THEN CREATE TYPE \"notifications_status_enum\" AS ENUM('unread', 'read', 'archived'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum') THEN CREATE TYPE \"notifications_type_enum\" AS ENUM('course_enrolled', 'course_completed', 'certificate_issued', 'payment_success', 'payment_failed', 'exam_reminder', 'exam_result', 'course_approved', 'course_rejected', 'new_review', 'new_student', 'system_announcement', 'promotion'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payments_paymentmethod_enum') THEN CREATE TYPE \"payments_paymentmethod_enum\" AS ENUM('credit_card', 'debit_card', 'paypal', 'bank_transfer', 'wallet', 'qr_code', 'vnpay', 'momo'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payments_status_enum') THEN CREATE TYPE \"payments_status_enum\" AS ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quiz_attempts_status_enum') THEN CREATE TYPE \"quiz_attempts_status_enum\" AS ENUM('in_progress', 'completed', 'expired'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resources_type_enum') THEN CREATE TYPE \"resources_type_enum\" AS ENUM('pdf', 'video', 'link', 'document', 'image', 'other'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'two_factor_auth_method_enum') THEN CREATE TYPE \"two_factor_auth_method_enum\" AS ENUM('totp', 'sms', 'email'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_sessions_status_enum') THEN CREATE TYPE \"user_sessions_status_enum\" AS ENUM('active', 'expired', 'revoked'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN CREATE TYPE \"users_role_enum\" AS ENUM('student', 'teacher', 'admin'); END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_status_enum') THEN CREATE TYPE \"users_status_enum\" AS ENUM('active', 'inactive', 'pending'); END IF; END $$");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TYPE IF EXISTS "users_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "users_role_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "user_sessions_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "two_factor_auth_method_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "resources_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "quiz_attempts_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "payments_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "payments_paymentmethod_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "notifications_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "notifications_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "lessons_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "exams_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "exams_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "exam_attempts_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "enrollments_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "courses_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "courses_level_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "coupons_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "coupons_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "certificates_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "certificate_templates_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "assignments_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "assignment_submissions_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "announcements_priority_enum"');
  }
}
