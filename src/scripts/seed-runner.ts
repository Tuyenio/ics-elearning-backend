import { DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import { seedDatabase } from '../database/seed';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { LessonProgress } from '../lesson-progress/entities/lesson-progress.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { QuizAttempt } from '../quizzes/entities/quiz-attempt.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Review } from '../reviews/entities/review.entity';
import { Note } from '../notes/entities/note.entity';
import { Wishlist } from '../wishlists/entities/wishlist.entity';

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
    Quiz,
    QuizAttempt,
    Certificate,
    Payment,
    Review,
    Note,
    Wishlist,
  ],
  synchronize: true,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function runSeed() {
  try {
    await AppDataSource.initialize();
    console.log('📦 Database connected');
    
    await seedDatabase(AppDataSource);
    
    await AppDataSource.destroy();
    console.log('👋 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

runSeed();
