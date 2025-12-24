# Database Migrations

This directory contains TypeORM migrations for the ICS E-Learning Platform.

## Migration Files Structure

Migrations are organized chronologically with timestamp prefixes:

### Core Tables (1730438400000 - 1730438900000)
- `1730438400000-CreateUsersTable.ts` - Users table with authentication
- `1730438500000-CreateCategoriesTable.ts` - Course categories
- `1730438600000-CreateCoursesTable.ts` - Courses with teacher/category relations
- `1730438700000-CreateLessonsTable.ts` - Course lessons
- `1730438800000-CreateEnrollmentsTable.ts` - Student enrollments
- `1730438900000-CreateLessonProgressTable.ts` - Lesson completion tracking

### Transaction Tables (1730439000000 - 1730439200000)
- `1730439000000-CreatePaymentsTable.ts` - Payment transactions
- `1730439100000-CreateCertificatesTable.ts` - Course certificates
- `1730439200000-CreateReviewsTable.ts` - Course reviews

### Assessment Tables (1730439300000 - 1730439400000)
- `1730439300000-CreateQuizzesAndAttemptsTable.ts` - Quizzes and attempts
- `1730439400000-CreateExamsAndAttemptsTable.ts` - Exams and attempts

### Feature Tables (1730439500000 - 1730439800000)
- `1730439500000-CreateNotesAndWishlistsTable.ts` - Student notes and wishlists
- `1730439600000-CreateAuthTables.ts` - Two-factor auth and user sessions
- `1730439700000-CreateNotificationsTable.ts` - Real-time notifications
- `1730439800000-CreateActivityLogsAndCertificateTemplatesTable.ts` - Activity logs and certificate templates

## Commands

### Run all pending migrations
```bash
pnpm run migration:run
```

### Revert last migration
```bash
pnpm run migration:revert
```

### Show migration status
```bash
pnpm run migration:show
```

### Generate new migration from entity changes
```bash
pnpm run migration:generate -- src/database/migrations/MigrationName
```

### Create empty migration
```bash
pnpm run migration:create -- src/database/migrations/MigrationName
```

## Database Schema Overview

### User Management
- **users** - User accounts with roles (admin, teacher, student)
- **user_sessions** - JWT refresh token sessions
- **two_factor_auth** - 2FA settings and backup codes

### Course Content
- **categories** - Course categories organization
- **courses** - Course information and metadata
- **lessons** - Individual lessons within courses
- **lesson_progress** - Student progress tracking

### Enrollment & Learning
- **enrollments** - Student course enrollments
- **notes** - Student notes during lessons
- **wishlists** - Saved courses for later

### Assessment
- **quizzes** - Course quizzes
- **quiz_attempts** - Quiz submission records
- **exams** - Official examinations
- **exam_attempts** - Exam submission records

### Payments & Certificates
- **payments** - Payment transactions (VNPay, Momo)
- **certificates** - Course completion certificates
- **certificate_templates** - Certificate design templates

### Engagement
- **reviews** - Course reviews and ratings
- **notifications** - Real-time user notifications
- **activity_logs** - System activity tracking

## Database Seeding

### Seed database with test data
```bash
pnpm run seed
```

Seeding creates:
- 3 test users (admin, teacher, student) with password: `12345678@Ab`
- Multiple categories, courses, lessons
- Sample enrollments, reviews, and payments

### Verify database
```bash
pnpm run check-db
```

### Fix course statistics
```bash
pnpm run fix-stats
```

## Notes

- All tables use UUID primary keys
- Foreign keys have CASCADE delete where appropriate
- Timestamps (createdAt, updatedAt) are automatic
- Migrations run automatically on server start in development
- UUID extension is auto-enabled in first migration
