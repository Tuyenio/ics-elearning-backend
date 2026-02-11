import { DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import {
  Course,
  CourseLevel,
  CourseStatus,
} from '../courses/entities/course.entity';
import { Category } from '../categories/entities/category.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { LessonProgress } from '../lesson-progress/entities/lesson-progress.entity';
import { Review } from '../reviews/entities/review.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Wishlist } from '../wishlists/entities/wishlist.entity';
import { Cart } from '../cart/entities/cart.entity';
import { Coupon } from '../coupons/entities/coupon.entity';
import { Announcement } from '../announcements/entities/announcement.entity';
import { Discussion } from '../discussions/entities/discussion.entity';
import {
  Assignment,
  AssignmentSubmission,
} from '../assignments/entities/assignment.entity';
import { Resource } from '../resources/entities/resource.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { SystemSetting } from '../system-settings/entities/system-setting.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { Exam } from '../exams/entities/exam.entity';
import { ExamAttempt } from '../exams/entities/exam-attempt.entity';
import { Note } from '../notes/entities/note.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { QuizAttempt } from '../quizzes/entities/quiz-attempt.entity';

ConfigModule.forRoot();

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    User,
    Category,
    Course,
    Lesson,
    Enrollment,
    LessonProgress,
    Review,
    Payment,
    Wishlist,
    Cart,
    Coupon,
    Announcement,
    Discussion,
    Assignment,
    AssignmentSubmission,
    Resource,
    Notification,
    SystemSetting,
    Certificate,
    Exam,
    ExamAttempt,
    Note,
    Quiz,
    QuizAttempt,
  ],
  synchronize: false,
  ssl: {
    rejectUnauthorized: false,
  },
});

const getArgValue = (name: string): string | undefined => {
  const index = process.argv.findIndex((arg) => arg === name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
};

async function seedTestCourse() {
  const email =
    getArgValue('--email') ||
    process.env.TEACHER_EMAIL ||
    'tuyenkoikop@gmail.com';
  const title =
    getArgValue('--title') ||
    process.env.COURSE_TITLE ||
    'Test Course for Certificates';

  await AppDataSource.initialize();
  console.log('📦 Database connected');

  const userRepo = AppDataSource.getRepository(User);
  const courseRepo = AppDataSource.getRepository(Course);
  const categoryRepo = AppDataSource.getRepository(Category);

  let teacher = await userRepo.findOne({ where: { email } });

  if (!teacher) {
    const hashedPassword = await bcrypt.hash('12345678@Ab', 12);
    teacher = await userRepo.save({
      email,
      password: hashedPassword,
      name: 'Seed Teacher',
      role: UserRole.TEACHER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    });
    console.log(`✅ Created teacher: ${teacher.email}`);
  }

  let category = await categoryRepo.findOne({
    where: { name: 'Seed Category' },
  });
  if (!category) {
    category = await categoryRepo.save({
      name: 'Seed Category',
      slug: 'seed-category',
      description: 'Danh muc test cho chung chi',
      icon: '🧪',
      order: 999,
      isActive: true,
    });
  }

  const slugBase = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const slug = `${slugBase}-${Date.now()}`;

  const course = courseRepo.create({
    title,
    slug,
    description: 'Khoa hoc test de tao chung chi',
    shortDescription: 'Khoa hoc test',
    price: 0,
    level: CourseLevel.BEGINNER,
    status: CourseStatus.PUBLISHED,
    teacherId: teacher.id,
    categoryId: category.id,
  });

  const saved = await courseRepo.save(course);

  console.log('✅ Seeded course:');
  console.log(`- id: ${saved.id}`);
  console.log(`- title: ${saved.title}`);
  console.log(`- teacher: ${teacher.email}`);

  await AppDataSource.destroy();
  console.log('👋 Database connection closed');
}

seedTestCourse().catch((error) => {
  console.error('❌ Error seeding test course:', error);
  process.exit(1);
});
