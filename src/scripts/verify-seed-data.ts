import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const expectedCounts: Record<string, number> = {
  announcements: 3,
  assignment_submissions: 1,
  assignments: 2,
  cart: 1,
  categories: 6,
  certificate_templates: 1,
  certificates: 1,
  coupons: 2,
  courses: 5,
  discussions: 3,
  enrollments: 3,
  exam_attempts: 1,
  exams: 2,
  extracted_exam_attempts: 0,
  extracted_exams: 0,
  instructor_payment_methods: 0,
  instructor_plans: 4,
  instructor_subscription_payments: 0,
  instructor_subscriptions: 0,
  lesson_progress: 12,
  lessons: 36,
  notes: 3,
  notifications: 10,
  payments: 3,
  quiz_answers: 0,
  quiz_attempts: 1,
  quiz_questions: 0,
  quizzes: 2,
  resources: 4,
  reviews: 3,
  schedule_items: 6,
  system_settings: 21,
  two_factor_auth: 0,
  user_sessions: 0,
  users: 3,
  wishlists: 2,
};

const expectedUsers = [
  { email: 'tt98tuyen@gmail.com', role: 'admin' },
  { email: 'nguyenngoctuyen11032003@gmail.com', role: 'teacher' },
  { email: 'nntuyen1132003@gmail.com', role: 'student' },
];

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: false,
  extra: {
    options: '-c search_path=learning,public',
  },
});

type CountRow = { count: string };
type UserRow = { email: string; role: string };

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function getTableCount(dataSource: DataSource, table: string): Promise<number> {
  const rows: CountRow[] = await dataSource.query(
    `SELECT COUNT(*)::text AS count FROM "learning"."${table}"`,
  );
  return Number(rows[0]?.count ?? '0');
}

async function verifySeedData() {
  console.log('Verifying seed data in learning schema...\n');

  await AppDataSource.initialize();
  try {
    let hasError = false;

    const tableNames = Object.keys(expectedCounts).sort((a, b) => a.localeCompare(b));
    for (const table of tableNames) {
      const actual = await getTableCount(AppDataSource, table);
      const expected = expectedCounts[table];

      if (actual === expected) {
        console.log(`OK  ${table}: expected=${expected}, actual=${actual}`);
      } else {
        hasError = true;
        console.log(`ERR ${table}: expected=${expected}, actual=${actual}`);
      }
    }

    console.log('');

    const users: UserRow[] = await AppDataSource.query(
      `SELECT email, role FROM "learning"."users" ORDER BY email ASC`,
    );

    for (const expectedUser of expectedUsers) {
      const found = users.find(
        (u) =>
          u.email.toLowerCase() === expectedUser.email.toLowerCase() &&
          u.role.toLowerCase() === expectedUser.role.toLowerCase(),
      );

      if (found) {
        console.log(`OK  user ${expectedUser.email} role=${expectedUser.role}`);
      } else {
        hasError = true;
        console.log(`ERR missing user ${expectedUser.email} role=${expectedUser.role}`);
      }
    }

    if (users.length !== expectedUsers.length) {
      hasError = true;
      console.log(`ERR users total: expected=${expectedUsers.length}, actual=${users.length}`);
    } else {
      console.log(`OK  users total: ${users.length}`);
    }

    console.log('');
    if (hasError) {
      console.log('Seed verification FAILED.');
      process.exit(1);
    }

    console.log('Seed verification PASSED.');
  } finally {
    await AppDataSource.destroy();
  }
}

verifySeedData().catch((error: unknown) => {
  console.error('Seed verification error:', getErrorMessage(error));
  process.exit(1);
});
