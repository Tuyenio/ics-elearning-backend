import { DataSource } from 'typeorm';

// Import all entities
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { LessonProgress } from '../lesson-progress/entities/lesson-progress.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { CertificateTemplate } from '../certificates/entities/certificate-template.entity';
import { Review } from '../reviews/entities/review.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { QuizAttempt } from '../quizzes/entities/quiz-attempt.entity';
import { Exam } from '../exams/entities/exam.entity';
import { ExamAttempt } from '../exams/entities/exam-attempt.entity';
import { Note } from '../notes/entities/note.entity';
import { Wishlist } from '../wishlists/entities/wishlist.entity';
import { UserSession } from '../auth/entities/user-session.entity';
import { TwoFactorAuth } from '../auth/entities/two-factor-auth.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { ActivityLog } from '../common/entities/activity-log.entity';
import { Cart } from '../cart/entities/cart.entity';
import { Coupon } from '../coupons/entities/coupon.entity';
import { Discussion } from '../discussions/entities/discussion.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { Announcement } from '../announcements/entities/announcement.entity';
import { Resource } from '../resources/entities/resource.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: 'postgresql://postgres.mmmhqscxluurkgudarcq:Minhlanhim1511@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres',
  entities: [
    User,
    Category,
    Course,
    Lesson,
    Enrollment,
    LessonProgress,
    Payment,
    Certificate,
    CertificateTemplate,
    Review,
    Quiz,
    QuizAttempt,
    Exam,
    ExamAttempt,
    Note,
    Wishlist,
    UserSession,
    TwoFactorAuth,
    Notification,
    ActivityLog,
    Cart,
    Coupon,
    Discussion,
    Assignment,
    Announcement,
    Resource,
  ],
  synchronize: true, // This will create all tables
  logging: true,
});

async function createTables() {
  console.log('🔨 BẮT ĐẦU TẠO CÁC BẢNG\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ Đã kết nối database');
    console.log('🔨 TypeORM đang tự động tạo các bảng...\n');

    // Synchronize will automatically create all tables
    await AppDataSource.synchronize();

    console.log('\n✅ ĐÃ TẠO TOÀN BỘ CÁC BẢNG THÀNH CÔNG!\n');

    // Get table count
    const tables = await AppDataSource.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    console.log(`📊 Tổng số bảng đã tạo: ${tables.length}\n`);
    tables.forEach((table: any) => {
      console.log(`   ✓ ${table.tablename}`);
    });

    await AppDataSource.destroy();
    console.log('\n👋 Đã đóng kết nối database\n');

  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

createTables();
