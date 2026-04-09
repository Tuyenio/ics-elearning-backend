import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { Course, CourseStatus } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { Review } from '../reviews/entities/review.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { AssignmentSubmission, SubmissionStatus } from '../assignments/entities/assignment.entity';
import { TeacherDashboardStats, EarningsData } from './dto/teacher-stats.dto';
import { EnrollmentStatus } from '../enrollments/entities/enrollment.entity';

@Injectable()
export class TeacherService {
  private getRootCourseId(course: Pick<Course, 'id' | 'sourceCourseId'>): string {
    return course.sourceCourseId || course.id;
  }

  private buildCourseVersionIndex(courses: Array<Pick<Course, 'id' | 'sourceCourseId' | 'createdAt'>>) {
    const coursesByRoot = new Map<string, Array<Pick<Course, 'id' | 'sourceCourseId' | 'createdAt'>>>();

    for (const course of courses) {
      const rootCourseId = this.getRootCourseId(course);
      if (!coursesByRoot.has(rootCourseId)) {
        coursesByRoot.set(rootCourseId, []);
      }
      coursesByRoot.get(rootCourseId)!.push(course);
    }

    const versionByCourseId = new Map<string, number>();

    for (const [, lineageCourses] of coursesByRoot.entries()) {
      lineageCourses
        .sort((a, b) => {
          const timeDiff = a.createdAt.getTime() - b.createdAt.getTime();
          if (timeDiff !== 0) return timeDiff;
          return a.id.localeCompare(b.id);
        })
        .forEach((course, index) => {
          versionByCourseId.set(course.id, index + 1);
        });
    }

    return versionByCourseId;
  }

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private startOfWeek(date: Date) {
    const day = date.getDay();
    const diff = (day + 6) % 7; // Monday as start of week
    const start = this.startOfDay(date);
    start.setDate(start.getDate() - diff);
    return start;
  }

  private resolvePeriodWindow(period?: 'day' | 'week' | 'month' | 'year') {
    const now = new Date();

    if (!period) {
      return {
        periodStart: null as Date | null,
        previousStart: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        previousEnd: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        currentStartForGrowth: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      };
    }

    if (period === 'day') {
      const periodStart = this.startOfDay(now);
      const previousStart = new Date(periodStart);
      previousStart.setDate(previousStart.getDate() - 1);
      return {
        periodStart,
        previousStart,
        previousEnd: periodStart,
        currentStartForGrowth: periodStart,
      };
    }

    if (period === 'week') {
      const periodStart = this.startOfWeek(now);
      const previousStart = new Date(periodStart);
      previousStart.setDate(previousStart.getDate() - 7);
      return {
        periodStart,
        previousStart,
        previousEnd: periodStart,
        currentStartForGrowth: periodStart,
      };
    }

    if (period === 'month') {
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return {
        periodStart,
        previousStart,
        previousEnd: periodStart,
        currentStartForGrowth: periodStart,
      };
    }

    const periodStart = new Date(now.getFullYear(), 0, 1);
    const previousStart = new Date(now.getFullYear() - 1, 0, 1);
    return {
      periodStart,
      previousStart,
      previousEnd: periodStart,
      currentStartForGrowth: periodStart,
    };
  }

  private buildPeriodBuckets(
    period: 'day' | 'week' | 'month' | 'year',
    locale: string = 'vi-VN',
  ) {
    const now = new Date();
    const today = this.startOfDay(now);

    if (period === 'day') {
      const start = today;
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return [
        {
          start,
          end,
          label: start.toLocaleDateString(locale, {
            day: '2-digit',
            month: '2-digit',
          }),
        },
      ];
    }

    if (period === 'week') {
      const buckets = [] as Array<{ start: Date; end: Date; label: string }>;
      const weekStart = this.startOfWeek(today);
      for (let i = 0; i < 7; i += 1) {
        const start = new Date(weekStart);
        start.setDate(weekStart.getDate() + i);
        if (start > today) break;
        const end = new Date(start);
        end.setDate(start.getDate() + 1);
        buckets.push({
          start,
          end,
          label: start.toLocaleDateString(locale, { weekday: 'short' }),
        });
      }
      return buckets;
    }

    if (period === 'month') {
      const buckets = [] as Array<{ start: Date; end: Date; label: string }>;
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day += 1) {
        const start = new Date(year, month, day);
        if (start > today) break;
        const end = new Date(year, month, day + 1);
        buckets.push({
          start,
          end,
          label: start.toLocaleDateString(locale, {
            day: '2-digit',
            month: '2-digit',
          }),
        });
      }

      return buckets;
    }

    const buckets = [] as Array<{ start: Date; end: Date; label: string }>;
    const year = now.getFullYear();
    for (let month = 0; month < 12; month += 1) {
      const start = new Date(year, month, 1);
      if (start > today) break;
      const end = new Date(year, month + 1, 1);
      buckets.push({
        start,
        end,
        label: start.toLocaleDateString(locale, { month: 'short' }),
      });
    }

    return buckets;
  }

  constructor(
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(AssignmentSubmission)
    private readonly assignmentSubmissionRepo: Repository<AssignmentSubmission>,
  ) {}

  async getCourseStudentsProgress(teacherId: string, courseId: string) {
    const course = await this.courseRepo.findOne({
      where: { id: courseId, teacherId },
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tồn tại hoặc không thuộc quyền quản lý của giảng viên');
    }

    const rootCourseId = this.getRootCourseId(course);
    const lineageCourses = await this.courseRepo.find({
      where: [{ id: rootCourseId, teacherId }, { sourceCourseId: rootCourseId, teacherId }],
      order: { createdAt: 'ASC' },
    });
    const versionByCourseId = this.buildCourseVersionIndex(lineageCourses);
    const courseVersionNumber = versionByCourseId.get(course.id) || 1;

    const enrollments = await this.enrollmentRepo.find({
      where: { courseId },
      relations: ['student'],
      order: { createdAt: 'DESC' },
    });

    const assignments = await this.assignmentRepo.find({ where: { courseId } });
    const assignmentIds = assignments.map((item) => item.id);

    const submissions = assignmentIds.length
      ? await this.assignmentSubmissionRepo.find({
          where: { assignmentId: In(assignmentIds) },
        })
      : [];

    const assignmentById = assignments.reduce<Record<string, Assignment>>(
      (acc, item) => {
        acc[item.id] = item;
        return acc;
      },
      {},
    );

    const scoreByStudent = submissions.reduce<
      Record<
        string,
        {
          gradedCount: number;
          submittedCount: number;
          totalScore: number;
          maxScoreTotal: number;
        }
      >
    >((acc, submission) => {
      const assignment = assignmentById[submission.assignmentId];
      if (!assignment) return acc;
      if (!acc[submission.studentId]) {
        acc[submission.studentId] = {
          gradedCount: 0,
          submittedCount: 0,
          totalScore: 0,
          maxScoreTotal: 0,
        };
      }

      if (submission.status !== SubmissionStatus.NOT_SUBMITTED) {
        acc[submission.studentId].submittedCount += 1;
      }

      if (
        submission.status === SubmissionStatus.GRADED &&
        typeof submission.score === 'number'
      ) {
        acc[submission.studentId].gradedCount += 1;
        acc[submission.studentId].totalScore += Number(submission.score);
        acc[submission.studentId].maxScoreTotal += Number(assignment.maxScore || 0);
      }

      return acc;
    }, {});

    const students = enrollments.map((enrollment) => {
      const stats = scoreByStudent[enrollment.studentId] || {
        gradedCount: 0,
        submittedCount: 0,
        totalScore: 0,
        maxScoreTotal: 0,
      };

      const scorePercentage =
        stats.maxScoreTotal > 0
          ? Math.round((stats.totalScore / stats.maxScoreTotal) * 1000) / 10
          : null;

      return {
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        studentName: enrollment.student?.name || 'N/A',
        studentEmail: enrollment.student?.email || '',
        rootCourseId,
        courseVersionId: course.id,
        courseVersionNumber,
        courseVersionLabel: `v${courseVersionNumber}`,
        courseVersionCreatedAt: course.createdAt,
        progress: Number(enrollment.progress || 0),
        enrollmentStatus: enrollment.status,
        joinedAt: enrollment.createdAt,
        lastActiveAt: enrollment.lastAccessedAt || enrollment.updatedAt,
        gradedAssignments: stats.gradedCount,
        submittedAssignments: stats.submittedCount,
        totalAssignments: assignments.length,
        scorePercentage,
      };
    });

    const averageProgress =
      students.length > 0
        ? Math.round(
            (students.reduce((sum, item) => sum + Number(item.progress || 0), 0) /
              students.length) *
              10,
          ) / 10
        : 0;

    const scoredStudents = students.filter(
      (item) => typeof item.scorePercentage === 'number',
    );
    const averageScore =
      scoredStudents.length > 0
        ? Math.round(
            (scoredStudents.reduce(
              (sum, item) => sum + Number(item.scorePercentage || 0),
              0,
            ) /
              scoredStudents.length) *
              10,
          ) / 10
        : 0;

    return {
      courseId: course.id,
      courseTitle: course.title,
      courseVersion: {
        rootCourseId,
        courseVersionId: course.id,
        courseVersionNumber,
        courseVersionLabel: `v${courseVersionNumber}`,
        courseVersionCreatedAt: course.createdAt,
      },
      summary: {
        totalStudents: students.length,
        totalAssignments: assignments.length,
        averageProgress,
        averageScore,
      },
      students,
    };
  }

  async getDashboardStats(
    teacherId: string,
    period?: 'day' | 'week' | 'month' | 'year',
  ): Promise<TeacherDashboardStats> {
    const now = new Date();
    const { periodStart, previousStart, previousEnd, currentStartForGrowth } =
      this.resolvePeriodWindow(period);

    // Get teacher courses
    const courses = await this.courseRepo.find({
      where: { teacherId },
      relations: ['category'],
    });
    const courseIds = courses.map((c) => c.id);

    if (courseIds.length === 0) {
      return {
        totalRevenue: 0,
        totalStudents: 0,
        totalCourses: 0,
        activeCourses: 0,
        totalViews: 0,
        averageRating: 0,
        completionRate: 0,
        revenueGrowth: 0,
        studentGrowth: 0,
        revenueChart: { labels: [], data: [] },
        studentChart: { labels: [], data: [] },
        weeklyPerformance: [],
        courseDistribution: [],
        coursePerformance: [],
        recentEnrollments: [],
      };
    }

    // Total revenue
    const payments = await this.paymentRepo.find({
      where: {
        courseId: In(courseIds),
        status: PaymentStatus.COMPLETED,
      },
    });
    const filteredPayments = periodStart
      ? payments.filter((p) => p.createdAt >= periodStart)
      : payments;

    const totalRevenue = filteredPayments.reduce(
      (sum, p) => sum + Number(p.finalAmount || 0),
      0,
    );

    // Recent revenue for growth
    const recentRevenue = payments
      .filter((p) => p.createdAt >= currentStartForGrowth)
      .reduce((sum, p) => sum + Number(p.finalAmount || 0), 0);
    const oldRevenue = payments
      .filter((p) => p.createdAt >= previousStart && p.createdAt < previousEnd)
      .reduce((sum, p) => sum + Number(p.finalAmount || 0), 0);
    const revenueGrowth =
      oldRevenue > 0 ? ((recentRevenue - oldRevenue) / oldRevenue) * 100 : 0;

    // Total students (unique enrollments)
    const totalStudentsQuery = this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .select('COUNT(DISTINCT enrollment.studentId)', 'count')
      .where('enrollment.courseId IN (:...courseIds)', { courseIds });
    if (periodStart) {
      totalStudentsQuery.andWhere('enrollment.createdAt >= :periodStart', {
        periodStart,
      });
    }
    const totalStudents = await totalStudentsQuery.getRawOne();

    const totalEnrollmentsQuery = this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .where('enrollment.courseId IN (:...courseIds)', { courseIds });
    if (periodStart) {
      totalEnrollmentsQuery.andWhere('enrollment.createdAt >= :periodStart', {
        periodStart,
      });
    }
    const totalEnrollments = await totalEnrollmentsQuery.getCount();

    const completionAggQuery = this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .select('AVG(enrollment.progress)', 'avg')
      .where('enrollment.courseId IN (:...courseIds)', { courseIds });
    if (periodStart) {
      completionAggQuery.andWhere('enrollment.createdAt >= :periodStart', {
        periodStart,
      });
    }
    const completionAgg = await completionAggQuery.getRawOne();

    // Recent students for growth
    const [recentStudents, oldStudents] = await Promise.all([
      this.enrollmentRepo
        .createQueryBuilder('enrollment')
        .select('COUNT(DISTINCT enrollment.studentId)', 'count')
        .where('enrollment.courseId IN (:...courseIds)', { courseIds })
        .andWhere('enrollment.createdAt >= :date', {
          date: currentStartForGrowth,
        })
        .getRawOne(),
      this.enrollmentRepo
        .createQueryBuilder('enrollment')
        .select('COUNT(DISTINCT enrollment.studentId)', 'count')
        .where('enrollment.courseId IN (:...courseIds)', { courseIds })
        .andWhere('enrollment.createdAt >= :start', { start: previousStart })
        .andWhere('enrollment.createdAt < :end', { end: previousEnd })
        .getRawOne(),
    ]);

    const studentGrowth =
      parseInt(oldStudents.count) > 0
        ? ((parseInt(recentStudents.count) - parseInt(oldStudents.count)) /
            parseInt(oldStudents.count)) *
          100
        : 0;

    // Average rating
    const reviews = await this.reviewRepo.find({
      where: { courseId: In(courseIds) },
    });
    const filteredReviews = periodStart
      ? reviews.filter((review) => review.createdAt >= periodStart)
      : reviews;
    const averageRating =
      filteredReviews.length > 0
        ? filteredReviews.reduce((sum, r) => sum + r.rating, 0) /
          filteredReviews.length
        : 0;

    const revenueChart = await this.getRevenueChart(teacherId, 12, period);

    const studentChart = await this.getEnrollmentChart(teacherId, 12, period);

    const weeklyPerformance = await this.getWeeklyPerformance(teacherId, period);

    const courseDistribution = this.buildCourseDistribution(courses);

    const enrollments = await this.enrollmentRepo.find({
      where: { courseId: In(courseIds) },
    });
    const filteredEnrollments = periodStart
      ? enrollments.filter((enrollment) => enrollment.createdAt >= periodStart)
      : enrollments;

    const coursePerformance = courses.map((course) => {
      const courseEnrollments = filteredEnrollments.filter(
        (e) => e.courseId === course.id,
      );
      const coursePayments = filteredPayments.filter(
        (p) => p.courseId === course.id,
      );
      const courseReviews = filteredReviews.filter((r) => r.courseId === course.id);

      const revenue = coursePayments.reduce(
        (sum, p) => sum + Number(p.finalAmount || 0),
        0,
      );
      const rating =
        courseReviews.length > 0
          ? courseReviews.reduce((sum, r) => sum + r.rating, 0) /
            courseReviews.length
          : Number(course.rating || 0);
      const completion =
        courseEnrollments.length > 0
          ? courseEnrollments.reduce(
              (sum, e) => sum + Number(e.progress || 0),
              0,
            ) / courseEnrollments.length
          : 0;

      return {
        id: course.id,
        title: course.title,
        students: courseEnrollments.length,
        revenue: Math.round(revenue),
        rating: Math.round(rating * 10) / 10,
        completionRate: Math.round(completion * 10) / 10,
      };
    });

    // Recent enrollments
    const recentEnrollments = await this.getRecentEnrollments(teacherId);

    return {
      totalRevenue,
      totalStudents: parseInt(totalStudents.count) || 0,
      totalCourses: courses.length,
      activeCourses: courses.filter((c) => c.status === CourseStatus.PUBLISHED)
        .length,
      totalViews: totalEnrollments,
      averageRating: Math.round(averageRating * 10) / 10,
      completionRate: completionAgg?.avg
        ? Math.round(Number(completionAgg.avg) * 10) / 10
        : 0,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      studentGrowth: Math.round(studentGrowth * 10) / 10,
      revenueChart,
      studentChart,
      weeklyPerformance,
      courseDistribution,
      coursePerformance,
      recentEnrollments,
    };
  }

  async getRevenueChart(
    teacherId: string,
    months: number = 12,
    period?: 'day' | 'week' | 'month' | 'year',
  ) {
    const labels: string[] = [];
    const data: number[] = [];
    const now = new Date();

    const courses = await this.courseRepo.find({ where: { teacherId } });
    const courseIds = courses.map((c) => c.id);

    if (courseIds.length === 0) {
      return { labels, data };
    }

    if (period) {
      const buckets = this.buildPeriodBuckets(period);
      if (!buckets.length) return { labels, data };

      const rangeStart = buckets[0].start;
      const rangeEnd = buckets[buckets.length - 1].end;

      const payments = await this.paymentRepo.find({
        where: {
          status: PaymentStatus.COMPLETED,
          courseId: In(courseIds),
          createdAt: Between(rangeStart, rangeEnd),
        },
      });

      for (const bucket of buckets) {
        const total = payments
          .filter(
            (p) => p.createdAt >= bucket.start && p.createdAt < bucket.end,
          )
          .reduce((sum, p) => sum + Number(p.finalAmount || 0), 0);
        labels.push(bucket.label);
        data.push(total);
      }

      return { labels, data };
    }

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthRevenue = await this.paymentRepo
        .createQueryBuilder('payment')
        .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .andWhere('payment.courseId IN (:...courseIds)', {
          courseIds: courseIds.length > 0 ? courseIds : [''],
        })
        .andWhere('payment.createdAt >= :start', { start })
        .andWhere('payment.createdAt < :end', { end })
        .getMany();

      const total = monthRevenue.reduce(
        (sum, p) => sum + Number(p.finalAmount || 0),
        0,
      );

      labels.push(start.toLocaleDateString('vi-VN', { month: 'short' }));
      data.push(total);
    }

    return { labels, data };
  }

  async getEnrollmentChart(
    teacherId: string,
    months: number = 12,
    period?: 'day' | 'week' | 'month' | 'year',
  ) {
    const labels: string[] = [];
    const data: number[] = [];
    const now = new Date();

    const courses = await this.courseRepo.find({ where: { teacherId } });
    const courseIds = courses.map((c) => c.id);

    if (courseIds.length === 0) {
      return { labels, data };
    }

    if (period) {
      const buckets = this.buildPeriodBuckets(period);
      if (!buckets.length) return { labels, data };

      const rangeStart = buckets[0].start;
      const rangeEnd = buckets[buckets.length - 1].end;

      const enrollments = await this.enrollmentRepo.find({
        where: {
          courseId: In(courseIds),
          createdAt: Between(rangeStart, rangeEnd),
        },
      });

      for (const bucket of buckets) {
        const count = enrollments.filter(
          (e) => e.createdAt >= bucket.start && e.createdAt < bucket.end,
        ).length;
        labels.push(bucket.label);
        data.push(count);
      }

      return { labels, data };
    }

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const count = await this.enrollmentRepo
        .createQueryBuilder('enrollment')
        .where('enrollment.courseId IN (:...courseIds)', {
          courseIds: courseIds.length > 0 ? courseIds : [''],
        })
        .andWhere('enrollment.createdAt >= :start', { start })
        .andWhere('enrollment.createdAt < :end', { end })
        .getCount();

      labels.push(start.toLocaleDateString('vi-VN', { month: 'short' }));
      data.push(count);
    }

    return { labels, data };
  }

  async getWeeklyPerformance(
    teacherId: string,
    period?: 'day' | 'week' | 'month' | 'year',
  ) {
    const now = new Date();
    const courses = await this.courseRepo.find({ where: { teacherId } });
    const courseIds = courses.map((c) => c.id);

    if (courseIds.length === 0) {
      return [];
    }

    const buckets = period ? this.buildPeriodBuckets(period) : null;

    const results: { day: string; revenue: number }[] = [];

    if (buckets && buckets.length > 0) {
      const rangeStart = buckets[0].start;
      const rangeEnd = buckets[buckets.length - 1].end;

      const payments = await this.paymentRepo.find({
        where: {
          status: PaymentStatus.COMPLETED,
          courseId: In(courseIds),
          createdAt: Between(rangeStart, rangeEnd),
        },
      });

      for (const bucket of buckets) {
        const revenue = payments
          .filter(
            (p) => p.createdAt >= bucket.start && p.createdAt < bucket.end,
          )
          .reduce((sum, p) => sum + Number(p.finalAmount || 0), 0);
        results.push({ day: bucket.label, revenue });
      }
    } else {
      for (let i = 6; i >= 0; i--) {
        const start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - i,
        );
        const end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - i + 1,
        );

        const payments = await this.paymentRepo
          .createQueryBuilder('payment')
          .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
          .andWhere('payment.courseId IN (:...courseIds)', {
            courseIds: courseIds.length > 0 ? courseIds : [''],
          })
          .andWhere('payment.createdAt >= :start', { start })
          .andWhere('payment.createdAt < :end', { end })
          .getMany();

        const revenue = payments.reduce(
          (sum, p) => sum + Number(p.finalAmount || 0),
          0,
        );
        results.push({
          day: start.toLocaleDateString('vi-VN', { weekday: 'short' }),
          revenue,
        });
      }
    }

    const avgRevenue =
      results.reduce((sum, r) => sum + r.revenue, 0) / (results.length || 1);

    return results.map((r) => ({
      ...r,
      target: Math.round(avgRevenue * 1.1),
    }));
  }

  buildCourseDistribution(courses: Course[]) {
    const categoryMap = new Map<string, number>();

    courses.forEach((course) => {
      const name = course.category?.name || 'Khác';
      categoryMap.set(name, (categoryMap.get(name) || 0) + 1);
    });

    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }

  async getRecentEnrollments(teacherId: string, limit: number = 10) {
    const courses = await this.courseRepo.find({ where: { teacherId } });
    const courseIds = courses.map((c) => c.id);

    if (courseIds.length === 0) {
      return [];
    }

    const enrollments = await this.enrollmentRepo.find({
      where: { courseId: In(courseIds) },
      relations: ['student', 'course'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return enrollments.map((e) => ({
      id: e.id,
      studentName: e.student.name,
      courseName: e.course.title,
      createdAt: e.createdAt,
      status: e.status,
    }));
  }

  async getEarnings(teacherId: string): Promise<EarningsData> {
    const courses = await this.courseRepo.find({
      where: { teacherId },
    });

    const courseIds = courses.map((c) => c.id);
    if (courseIds.length === 0) {
      return {
        totalEarnings: 0,
        pendingEarnings: 0,
        paidEarnings: 0,
        byCourse: [],
        payments: [],
      };
    }

    // Get all payments for this teacher's courses
    const payments = await this.paymentRepo.find({
      where: { courseId: In(courseIds) },
      relations: ['course', 'student'],
      order: { createdAt: 'DESC' },
    });

    const completedPayments = payments.filter(
      (p) => p.status === PaymentStatus.COMPLETED,
    );
    const pendingPayments = payments.filter(
      (p) => p.status === PaymentStatus.PENDING,
    );

    const totalEarnings = completedPayments.reduce(
      (sum, p) => sum + Number(p.finalAmount ?? p.amount ?? 0),
      0,
    );

    // For simplicity, assume 70% goes to teacher, 30% to platform
    const teacherCut = Math.round(totalEarnings * 0.7);
    const pendingEarnings = Math.round(
      pendingPayments.reduce(
        (sum, p) => sum + Number(p.finalAmount ?? p.amount ?? 0),
        0,
      ) * 0.7,
    );

    // Earnings by course (completed payments only)
    const byCourse = courses.map((course) => {
      const coursePayments = completedPayments.filter(
        (p) => p.courseId === course.id,
      );
      const earnings =
        coursePayments.reduce(
          (sum, p) => sum + Number(p.finalAmount ?? p.amount ?? 0),
          0,
        ) * 0.7;

      return {
        courseId: course.id,
        courseName: course.title,
        earnings: Math.round(earnings),
        enrollments: coursePayments.length,
      };
    });

    const paymentRows = payments.map((p) => ({
      id: p.id,
      studentName: p.student?.name || 'N/A',
      studentEmail: p.student?.email || '',
      courseName: p.course?.title || 'N/A',
      courseId: p.courseId,
      amount: Number(p.finalAmount ?? p.amount ?? 0),
      method: p.paymentMethod,
      status: p.status,
      date: p.paidAt || p.createdAt,
      transactionId: p.transactionId,
    }));

    return {
      totalEarnings: teacherCut,
      pendingEarnings,
      paidEarnings: teacherCut,
      byCourse,
      payments: paymentRows,
    };
  }

  async getStudentList(teacherId: string) {
    const courses = await this.courseRepo.find({ where: { teacherId } });
    const courseIds = courses.map((c) => c.id);
    const versionByCourseId = this.buildCourseVersionIndex(courses);

    if (courseIds.length === 0) {
      return { data: [], total: 0 };
    }

    const enrollments = await this.enrollmentRepo.find({
      where: { courseId: In(courseIds) },
      relations: ['student', 'course'],
      order: { createdAt: 'DESC' },
    });

    const data = enrollments.map((e) => ({
      rootCourseId: this.getRootCourseId(e.course),
      courseVersionId: e.courseId,
      courseVersionNumber: versionByCourseId.get(e.courseId) || 1,
      courseVersionLabel: `v${versionByCourseId.get(e.courseId) || 1}`,
      courseVersionCreatedAt: e.course?.createdAt || null,
      id: e.id,
      studentId: e.studentId,
      name: e.student?.name || 'N/A',
      email: e.student?.email || '',
      phone: e.student?.phone || '',
      avatar: e.student?.avatar || '',
      courseId: e.courseId,
      courseName: e.course?.title || 'N/A',
      progress: Number(e.progress || 0),
      status: e.status,
      joinDate: e.createdAt,
      lastActive: e.lastAccessedAt || e.updatedAt || e.createdAt,
    }));

    return {
      data,
      total: data.length,
    };
  }

  async removeStudentEnrollment(teacherId: string, enrollmentId: string) {
    const enrollment = await this.enrollmentRepo.findOne({
      where: { id: enrollmentId },
      relations: ['course'],
    });

    if (!enrollment) {
      throw new NotFoundException('Không tìm thấy ghi danh học viên');
    }

    if (!enrollment.course || enrollment.course.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền xóa học viên của khóa học này');
    }

    await this.enrollmentRepo.remove(enrollment);

    await this.courseRepo.query(
      'UPDATE learning.courses SET "enrollmentCount" = GREATEST(COALESCE("enrollmentCount", 0) - 1, 0) WHERE id = $1',
      [enrollment.courseId],
    );

    return {
      success: true,
      enrollmentId,
      courseId: enrollment.courseId,
      message: 'Đã xóa học viên khỏi khóa học',
    };
  }

  async exportStudentsToCSV(teacherId: string): Promise<string> {
    const { data } = await this.getStudentList(teacherId);

    const headers = ['Student Name', 'Email', 'Phone', 'Course', 'Progress'];
    const rows = data.map((s) => [
      s.name,
      s.email,
      s.phone,
      s.courseName,
      `${s.progress}%`,
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  async exportEarningsToCSV(teacherId: string): Promise<string> {
    const earnings = await this.getEarnings(teacherId);

    const headers = ['Course Name', 'Enrollments', 'Earnings (VND)'];
    const rows = earnings.byCourse.map((c) => [
      c.courseName,
      c.enrollments,
      c.earnings,
    ]);

    return [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
      '',
      `Total Earnings,${earnings.totalEarnings}`,
    ].join('\n');
  }

  async getTeacherReviews(teacherId: string) {
    // Only get published courses (excluding rejected, draft, etc.)
    const courses = await this.courseRepo.find({
      where: { teacherId, status: CourseStatus.PUBLISHED },
      relations: ['category'],
    });
    const courseIds = courses.map((c) => c.id);

    if (courseIds.length === 0) {
      return {
        stats: {
          totalReviews: 0,
          averageRating: 0,
          fiveStarCount: 0,
          responseRate: 0,
        },
        courses: [],
        reviews: [],
      };
    }

    // Build version index for all published courses
    const versionByCourseId = this.buildCourseVersionIndex(courses);

    const reviews = await this.reviewRepo.find({
      where: { courseId: In(courseIds) },
      relations: ['student', 'course'],
      order: { createdAt: 'DESC' },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Math.round(
            (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
              totalReviews) *
              10,
          ) / 10
        : 0;
    const fiveStarCount = reviews.filter((r) => r.rating === 5).length;
    const responseRate =
      totalReviews > 0
        ? Math.round(
            (reviews.filter((r) => !!r.teacherReply).length / totalReviews) *
              100,
          )
        : 0;

    const coursesList = courses.map((c) => ({
      id: c.id,
      name: c.title,
      level: c.level,
      categoryName: c.category?.name || 'Chưa phân loại',
      version: versionByCourseId.get(c.id) || 1,
      isOldVersion: !!c.sourceCourseId && versionByCourseId.get(c.id)! > 1,
      sourceCourseId: c.sourceCourseId || null,
    }));

    const mapped = reviews.map((r) => {
      const course = courses.find((c) => c.id === r.courseId);
      return {
        id: r.id,
        courseId: r.courseId,
        courseName: r.course?.title || '',
        level: r.course?.level || '',
        categoryName: course?.category?.name || 'Chưa phân loại',
        version: versionByCourseId.get(r.courseId) || 1,
        isOldVersion: !!r.course?.sourceCourseId && versionByCourseId.get(r.courseId)! > 1,
        studentName: r.student?.name || 'N/A',
        studentAvatar: r.student?.avatar || '',
        studentEmail: r.student?.email || '',
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        helpful: r.helpfulCount,
        teacherReply: r.teacherReply || '',
        repliedAt: r.repliedAt || undefined,
        response: r.teacherReply || '',
        responseDate: r.repliedAt || undefined,
      };
    });

    return {
      stats: {
        totalReviews,
        averageRating,
        fiveStarCount,
        responseRate,
      },
      courses: coursesList,
      reviews: mapped,
    };
  }

  async replyToReview(teacherId: string, reviewId: string, reply: string) {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId },
      relations: ['course'],
    });
    if (!review) {
      throw new Error('Review not found');
    }

    const course = await this.courseRepo.findOne({
      where: { id: review.courseId, teacherId },
    });
    if (!course) {
      throw new Error('Not authorized to reply to this review');
    }

    review.teacherReply = reply;
    review.repliedAt = new Date();

    await this.reviewRepo.save(review);

    return {
      id: review.id,
      teacherReply: review.teacherReply,
      repliedAt: review.repliedAt,
      response: review.teacherReply,
      responseDate: review.repliedAt,
    };
  }
}
