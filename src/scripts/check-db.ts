import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity';
import { LessonProgress } from '../lesson-progress/entities/lesson-progress.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Review } from '../reviews/entities/review.entity';
import { Note } from '../notes/entities/note.entity';
import { Wishlist } from '../wishlists/entities/wishlist.entity';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Category, Course, Lesson, Enrollment, LessonProgress, Certificate, Payment, Review, Note, Wishlist],
  ssl: true,
  extra: {
    ssl: {
      rejectUnauthorized: false,
    },
  },
});

async function checkDatabase() {
  console.log('🔍 KIỂM TRA DATABASE CHI TIẾT\n');
  
  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    const userRepo = dataSource.getRepository(User);
    const categoryRepo = dataSource.getRepository(Category);
    const courseRepo = dataSource.getRepository(Course);
    const lessonRepo = dataSource.getRepository(Lesson);
    const enrollmentRepo = dataSource.getRepository(Enrollment);
    const progressRepo = dataSource.getRepository(LessonProgress);
    const certRepo = dataSource.getRepository(Certificate);
    const paymentRepo = dataSource.getRepository(Payment);
    const reviewRepo = dataSource.getRepository(Review);
    const noteRepo = dataSource.getRepository(Note);
    const wishlistRepo = dataSource.getRepository(Wishlist);

    console.log('📊 SỐ LƯỢNG BẢN GHI:\n');
    console.log(`  Users: ${await userRepo.count()}`);
    console.log(`  Categories: ${await categoryRepo.count()}`);
    console.log(`  Courses: ${await courseRepo.count()}`);
    console.log(`  Lessons: ${await lessonRepo.count()}`);
    console.log(`  Enrollments: ${await enrollmentRepo.count()}`);
    console.log(`  Lesson Progress: ${await progressRepo.count()}`);
    console.log(`  Certificates: ${await certRepo.count()}`);
    console.log(`  Payments: ${await paymentRepo.count()}`);
    console.log(`  Reviews: ${await reviewRepo.count()}`);
    console.log(`  Notes: ${await noteRepo.count()}`);
    console.log(`  Wishlists: ${await wishlistRepo.count()}`);

    console.log('\n\n👥 USERS:\n');
    const users = await userRepo.find();
    for (const user of users) {
      console.log(`  ${user.name} (${user.email})`);
      console.log(`    Role: ${user.role}, Status: ${user.status}`);
    }

    console.log('\n\n🎓 COURSES:\n');
    const courses = await courseRepo.find({ relations: ['teacher'] });
    for (const course of courses) {
      console.log(`  ${course.title}`);
      console.log(`    Teacher: ${course.teacher?.name || 'N/A'}`);
      console.log(`    Enrollments: ${course.enrollmentCount}`);
      console.log(`    Reviews: ${course.reviewCount}`);
      console.log(`    Rating: ${course.rating}`);
    }

    console.log('\n\n🔗 KIỂM TRA TÍNH NHẤT QUÁN:\n');

    // Check enrollments -> payments
    const enrollments = await enrollmentRepo.find();
    let missingPayments = 0;
    for (const e of enrollments) {
      const payment = await paymentRepo.findOne({ 
        where: { studentId: e.studentId, courseId: e.courseId } 
      });
      if (!payment) missingPayments++;
    }
    console.log(`  Enrollments without payment: ${missingPayments} ${missingPayments === 0 ? '✅' : '⚠️'}`);

    // Check completed -> certificates
    const completed = await enrollmentRepo.find({ where: { status: EnrollmentStatus.COMPLETED } });
    let missingCerts = 0;
    for (const e of completed) {
      const cert = await certRepo.findOne({ where: { enrollmentId: e.id } });
      if (!cert) missingCerts++;
    }
    console.log(`  Completed without certificate: ${missingCerts} ${missingCerts === 0 ? '✅' : '⚠️'}`);

    // Check course stats
    console.log('\n\n📈 COURSE STATISTICS:\n');
    for (const course of courses) {
      const actualEnrollments = await enrollmentRepo.count({ where: { courseId: course.id } });
      const actualReviews = await reviewRepo.count({ where: { courseId: course.id } });
      const actualLessons = await lessonRepo.count({ where: { courseId: course.id } });
      
      const enrollMatch = course.enrollmentCount === actualEnrollments;
      const reviewMatch = course.reviewCount === actualReviews;
      
      console.log(`  ${course.title}:`);
      console.log(`    Enrollment: ${course.enrollmentCount} vs ${actualEnrollments} ${enrollMatch ? '✅' : '⚠️'}`);
      console.log(`    Review: ${course.reviewCount} vs ${actualReviews} ${reviewMatch ? '✅' : '⚠️'}`);
      console.log(`    Lessons: ${actualLessons}`);
    }

    console.log('\n\n✅ KIỂM TRA HOÀN TẤT!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await dataSource.destroy();
  }
}

checkDatabase();
