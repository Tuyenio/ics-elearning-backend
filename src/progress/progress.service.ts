import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { LessonProgress } from '../lesson-progress/entities/lesson-progress.entity';
import {
  Certificate,
  CertificateStatus,
} from '../certificates/entities/certificate.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import {
  ProgressOverview,
  WeeklyProgress,
  CourseProgress,
  DailyActivity,
  Achievement,
} from './dto/progress.dto';

@Injectable()
export class ProgressService {
  private static readonly UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepo: Repository<LessonProgress>,
    @InjectRepository(Certificate)
    private readonly certificateRepo: Repository<Certificate>,
    @InjectRepository(Lesson)
    private readonly lessonRepo: Repository<Lesson>,
  ) {}

  private isValidUuid(value: string | null | undefined): value is string {
    return typeof value === 'string' && ProgressService.UUID_PATTERN.test(value);
  }

  private resolveProgressSeconds(progress: LessonProgress): number {
    const lessonDuration = Number(progress.lesson?.duration || 0);
    const lastPosition = Number(progress.lastPosition || 0);
    const progressPercent = Number(progress.progress || 0);

    if (progress.completedAt) {
      if (lessonDuration > 0) return lessonDuration;
      return Math.max(0, lastPosition);
    }

    if (lastPosition > 0) return Math.min(lastPosition, lessonDuration || lastPosition);
    if (lessonDuration > 0 && progressPercent > 0) {
      return Math.min(
        lessonDuration,
        Math.round((lessonDuration * progressPercent) / 100),
      );
    }
    return 0;
  }

  async getOverview(studentId: string): Promise<ProgressOverview> {
    const enrollments = await this.enrollmentRepo.find({
      where: { studentId },
    });

    const totalCoursesEnrolled = enrollments.length;
    const coursesCompleted = enrollments.filter((e) => e.completedAt).length;
    const coursesInProgress = totalCoursesEnrolled - coursesCompleted;
    const completionRate =
      totalCoursesEnrolled > 0
        ? (coursesCompleted / totalCoursesEnrolled) * 100
        : 0;

    const certificatesEarned = await this.certificateRepo.count({
      where: { studentId, status: CertificateStatus.APPROVED },
    });

    // Calculate streaks (simplified - would need proper activity tracking)
    const lessonProgress = await this.lessonProgressRepo
      .createQueryBuilder('progress')
      .innerJoin('progress.enrollment', 'enrollment')
      .leftJoinAndSelect('progress.lesson', 'lesson')
      .where('enrollment.studentId = :studentId', { studentId })
      .orderBy('progress.updatedAt', 'DESC')
      .getMany();

    const { currentStreak, longestStreak } =
      this.calculateStreaks(lessonProgress);

    // Total learning time (placeholder - would need time tracking)
    const totalLearningSeconds = lessonProgress.reduce(
      (sum, entry) => sum + this.resolveProgressSeconds(entry),
      0,
    );
    const totalLearningTime = totalLearningSeconds / 3600;

    return {
      totalCoursesEnrolled,
      coursesInProgress,
      coursesCompleted,
      completionRate: Math.round(completionRate * 10) / 10,
      totalLearningTime: Math.round(totalLearningTime * 10) / 10,
      certificatesEarned,
      currentStreak,
      longestStreak,
    };
  }

  private calculateStreaks(progressEntries: LessonProgress[]): {
    currentStreak: number;
    longestStreak: number;
  } {
    if (progressEntries.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    const dates = progressEntries
      .map((p) => p.completedAt || p.updatedAt)
      .filter((d) => d)
      .map((d) => new Date(d).toISOString().split('T')[0])
      .filter((d, i, arr) => arr.indexOf(d) === i) // unique dates
      .sort((a, b) => b.localeCompare(a)); // descending

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    const today = new Date().toISOString().split('T')[0];

    if (dates[0] === today) {
      currentStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i - 1]);
        const currDate = new Date(dates[i]);
        const diffDays = Math.floor(
          (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const diffDays = Math.floor(
        (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, currentStreak, 1);

    return { currentStreak, longestStreak };
  }

  async getWeeklyProgress(studentId: string): Promise<WeeklyProgress> {
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weekProgress = await this.lessonProgressRepo
      .createQueryBuilder('progress')
      .innerJoin('progress.enrollment', 'enrollment')
      .leftJoinAndSelect('progress.lesson', 'lesson')
      .where('enrollment.studentId = :studentId', { studentId })
      .andWhere('progress.updatedAt > :weekStart', { weekStart })
      .orderBy('progress.updatedAt', 'ASC')
      .getMany();

    const lessonsCompleted = weekProgress.filter((entry) => entry.completedAt).length;
    const timeSpentSeconds = weekProgress.reduce(
      (sum, entry) => sum + this.resolveProgressSeconds(entry),
      0,
    );
    const timeSpent = timeSpentSeconds / 3600;

    // Active courses
    const courseIds = new Set(
      weekProgress.map((p) => p.lesson?.courseId).filter(Boolean),
    );
    const coursesActive = courseIds.size;

    // Daily activity
    const dailyActivity: DailyActivity[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      const dayProgress = weekProgress.filter((p) => {
        const stamp = p.completedAt || p.updatedAt;
        if (!stamp) return false;
        const pDate = new Date(stamp).toISOString().split('T')[0];
        return pDate === dateStr;
      });

      const daySeconds = dayProgress.reduce(
        (sum, entry) => sum + this.resolveProgressSeconds(entry),
        0,
      );

      dailyActivity.push({
        date: dateStr,
        lessonsCompleted: dayProgress.length,
        timeSpent: Math.round((daySeconds / 3600) * 10) / 10,
        active: dayProgress.length > 0,
      });
    }

    return {
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: now.toISOString().split('T')[0],
      lessonsCompleted,
      timeSpent: Math.round(timeSpent * 10) / 10,
      coursesActive,
      quizzesTaken: 0, // Placeholder
      averageScore: 0, // Placeholder
      dailyActivity,
    };
  }

  async getCourseProgress(
    studentId: string,
    courseId: string,
  ): Promise<CourseProgress | null> {
    if (!this.isValidUuid(courseId)) {
      return null;
    }

    const enrollment = await this.enrollmentRepo.findOne({
      where: { studentId, courseId },
      relations: ['course', 'course.teacher'],
    });

    if (!enrollment || !enrollment.course) {
      return null;
    }

    const totalLessons = await this.lessonRepo.count({ where: { courseId } });

    const completedProgress = await this.lessonProgressRepo
      .createQueryBuilder('progress')
      .innerJoin('progress.enrollment', 'enrollment')
      .innerJoin('progress.lesson', 'lesson')
      .where('enrollment.studentId = :studentId', { studentId })
      .andWhere('lesson.courseId = :courseId', { courseId })
      .leftJoinAndSelect('progress.lesson', 'progressLesson')
      .getMany();

    const completedLessons = completedProgress.filter(
      (p) => p.completedAt,
    ).length;
    const progressPercentage =
      totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    // Find next lesson
    const completedLessonIds = completedProgress
      .filter((p) => p.completedAt)
      .map((p) => p.lessonId);

    const nextLessonQuery = this.lessonRepo
      .createQueryBuilder('lesson')
      .where('lesson.courseId = :courseId', { courseId });

    if (completedLessonIds.length > 0) {
      nextLessonQuery.andWhere('lesson.id NOT IN (:...completedIds)', {
        completedIds: completedLessonIds,
      });
    }

    const nextLesson = await nextLessonQuery
      .orderBy('lesson.order', 'ASC')
      .getOne();

    // Last accessed
    const lastProgress = completedProgress.sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() -
        new Date(a.updatedAt || 0).getTime(),
    )[0];

    const totalSeconds = completedProgress.reduce(
      (sum, entry) => sum + this.resolveProgressSeconds(entry),
      0,
    );

    return {
      courseId: enrollment.course.id,
      courseTitle: enrollment.course.title,
      courseThumbnail: enrollment.course.thumbnail,
      teacherName: enrollment.course.teacher?.name || '',
      totalLessons,
      completedLessons,
      progressPercentage: Math.round(progressPercentage * 10) / 10,
      lastAccessedAt: lastProgress?.updatedAt || enrollment.createdAt,
      timeSpent: Math.round((totalSeconds / 3600) * 10) / 10,
      quizzesTaken: 0, // Placeholder
      averageQuizScore: 0, // Placeholder
      nextLesson: nextLesson
        ? {
            id: nextLesson.id,
            title: nextLesson.title,
            order: nextLesson.order,
          }
        : null,
    };
  }

  async getAllCourseProgress(studentId: string): Promise<CourseProgress[]> {
    const enrollments = await this.enrollmentRepo.find({
      where: { studentId },
      relations: ['course', 'course.teacher'],
    });

    const progressPromises = enrollments
      .filter((e) => e?.course && this.isValidUuid(e.courseId))
      .map((e) => this.getCourseProgress(studentId, e.courseId));

    const results = await Promise.all(progressPromises);
    return results.filter((r) => r !== null);
  }

  async getAchievements(studentId: string): Promise<Achievement[]> {
    const achievements: Achievement[] = [];

    // Check achievements based on progress
    const overview = await this.getOverview(studentId);

    // First course completed
    if (overview.coursesCompleted >= 1) {
      achievements.push({
        id: 'first-course',
        title: 'First Step',
        description: 'Completed your first course',
        icon: '🎓',
        unlockedAt: new Date(),
        category: 'completion',
      });
    }

    // 5 courses completed
    if (overview.coursesCompleted >= 5) {
      achievements.push({
        id: 'five-courses',
        title: 'Knowledge Seeker',
        description: 'Completed 5 courses',
        icon: '📚',
        unlockedAt: new Date(),
        category: 'completion',
      });
    }

    // 7-day streak
    if (overview.currentStreak >= 7) {
      achievements.push({
        id: 'week-streak',
        title: 'Week Warrior',
        description: '7-day learning streak',
        icon: '🔥',
        unlockedAt: new Date(),
        category: 'streak',
      });
    }

    // 30-day streak
    if (overview.longestStreak >= 30) {
      achievements.push({
        id: 'month-streak',
        title: 'Consistency King',
        description: '30-day learning streak',
        icon: '👑',
        unlockedAt: new Date(),
        category: 'streak',
      });
    }

    // Certificate earned
    if (overview.certificatesEarned >= 1) {
      achievements.push({
        id: 'first-certificate',
        title: 'Certified',
        description: 'Earned your first certificate',
        icon: '🏆',
        unlockedAt: new Date(),
        category: 'completion',
      });
    }

    return achievements;
  }
}
