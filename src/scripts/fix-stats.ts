import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Review } from '../reviews/entities/review.entity';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Course, Enrollment, Review],
  ssl: true,
  extra: {
    ssl: {
      rejectUnauthorized: false,
    },
  },
});

async function fixCourseStats() {
  console.log('🔧 FIXING COURSE STATISTICS\n');
  
  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    const courseRepo = dataSource.getRepository(Course);
    const enrollmentRepo = dataSource.getRepository(Enrollment);
    const reviewRepo = dataSource.getRepository(Review);

    const courses = await courseRepo.find();
    
    console.log('📊 Updating course statistics...\n');
    
    for (const course of courses) {
      // Count actual enrollments
      const actualEnrollments = await enrollmentRepo.count({ 
        where: { courseId: course.id } 
      });
      
      // Count actual reviews
      const actualReviews = await reviewRepo.count({ 
        where: { courseId: course.id } 
      });
      
      // Calculate average rating
      let avgRating = 0;
      if (actualReviews > 0) {
        const reviews = await reviewRepo.find({ where: { courseId: course.id } });
        avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      }
      
      // Update course
      await courseRepo.update(course.id, {
        enrollmentCount: actualEnrollments,
        reviewCount: actualReviews,
        rating: actualReviews > 0 ? Math.round(avgRating * 10) / 10 : course.rating,
      });
      
      console.log(`✅ ${course.title}`);
      console.log(`   Enrollments: ${course.enrollmentCount} → ${actualEnrollments}`);
      console.log(`   Reviews: ${course.reviewCount} → ${actualReviews}`);
      if (actualReviews > 0) {
        console.log(`   Rating: ${course.rating} → ${Math.round(avgRating * 10) / 10}`);
      }
      console.log('');
    }

    console.log('✅ ALL COURSE STATISTICS UPDATED!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await dataSource.destroy();
  }
}

fixCourseStats();
