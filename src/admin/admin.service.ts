/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Course, CourseStatus } from '../courses/entities/course.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity';
import { Category } from '../categories/entities/category.entity';
import { Review } from '../reviews/entities/review.entity';
import { InstructorSubscription, InstructorSubscriptionStatus } from '../instructor-subscriptions/entities/instructor-subscription.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import {
  DashboardStats,
  GrowthStats,
  CategoryDistribution,
} from './dto/dashboard-stats.dto';
import {
  RevenueReport,
  UserReport,
  PerformanceReport,
  MonthlyRevenue,
  TeacherRevenue,
  CategoryRevenue,
  RoleDistribution,
  UserGrowth,
  TopStudent,
  TopTeacher,
  CoursePerformance,
  CompletionRate,
  EngagementMetrics,
} from './dto/admin-reports.dto';

type AdminPeriod = 'day' | 'week' | 'month' | 'year';

type PeriodRange = {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
};

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(InstructorSubscription)
    private readonly instructorSubscriptionRepo: Repository<InstructorSubscription>,
    @InjectRepository(Certificate)
    private readonly certificateRepo: Repository<Certificate>,
  ) {}

  private normalizePeriod(period?: string): AdminPeriod {
    if (period === 'day' || period === 'week' || period === 'month' || period === 'year') {
      return period;
    }
    return 'month';
  }

  private getPeriodRange(period: AdminPeriod): PeriodRange {
    const now = new Date();
    const currentEnd = now;
    const currentStart = new Date(now);

    if (period === 'day') {
      currentStart.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      const day = currentStart.getDay();
      const diff = day === 0 ? 6 : day - 1;
      currentStart.setDate(currentStart.getDate() - diff);
      currentStart.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      // Rolling 30-day window keeps month aggregates consistent with week/day expectations.
      currentStart.setDate(currentStart.getDate() - 29);
      currentStart.setHours(0, 0, 0, 0);
    } else {
      currentStart.setMonth(0, 1);
      currentStart.setHours(0, 0, 0, 0);
    }

    const durationMs = Math.max(currentEnd.getTime() - currentStart.getTime(), 60 * 60 * 1000);
    const previousEnd = new Date(currentStart);
    const previousStart = new Date(currentStart.getTime() - durationMs);

    return {
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
    };
  }

  private buildRevenueBuckets(period: AdminPeriod, range: PeriodRange) {
    if (period === 'day') {
      return Array.from({ length: 24 }, (_, hour) => {
        const start = new Date(range.currentStart);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start);
        end.setHours(start.getHours() + 1);
        return { key: hour, label: `${String(hour).padStart(2, '0')}:00`, start, end };
      });
    }

    if (period === 'week') {
      const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
      return days.map((label, index) => {
        const start = new Date(range.currentStart);
        start.setDate(range.currentStart.getDate() + index);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 1);
        return { key: index, label, start, end };
      });
    }

    if (period === 'month') {
      return Array.from({ length: 30 }, (_, offset) => {
        const start = new Date(range.currentStart);
        start.setDate(range.currentStart.getDate() + offset);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 1);
        const label = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`;
        return { key: offset, label, start, end };
      });
    }

    return Array.from({ length: 12 }, (_, monthIndex) => {
      const start = new Date(range.currentStart.getFullYear(), monthIndex, 1);
      const end = new Date(range.currentStart.getFullYear(), monthIndex + 1, 1);
      return {
        key: monthIndex,
        label: start.toLocaleDateString('vi-VN', { month: 'short' }),
        start,
        end,
      };
    });
  }

  private buildGrowthBuckets(period: AdminPeriod, range: PeriodRange) {
    const revenueBuckets = this.buildRevenueBuckets(period, range);
    return revenueBuckets.map((bucket) => ({
      label: bucket.label,
      start: bucket.start,
      end: bucket.end,
    }));
  }

  async getDashboardStats(period?: string): Promise<DashboardStats> {
    const normalizedPeriod = this.normalizePeriod(period);
    const range = this.getPeriodRange(normalizedPeriod);

    // Total counts
    const [totalTeachers, totalStudents, totalCourses] = await Promise.all([
      this.userRepo.count({ where: { role: UserRole.TEACHER, createdAt: Between(range.currentStart, range.currentEnd) } }),
      this.userRepo.count({ where: { role: UserRole.STUDENT, createdAt: Between(range.currentStart, range.currentEnd) } }),
      this.courseRepo.count({ where: { createdAt: Between(range.currentStart, range.currentEnd) } }),
    ]);

    // Revenue calculations
    const completedPayments = await this.paymentRepo.find({
      where: { status: PaymentStatus.COMPLETED, createdAt: Between(range.currentStart, range.currentEnd) },
    });
    const totalRevenue = completedPayments.reduce(
      (sum, p) => sum + Number(p.finalAmount || 0),
      0,
    );

    const recentRevenue = completedPayments
      .filter((p) => p.createdAt >= range.currentStart)
      .reduce((sum, p) => sum + Number(p.finalAmount || 0), 0);

    const previousPayments = await this.paymentRepo.find({
      where: { status: PaymentStatus.COMPLETED, createdAt: Between(range.previousStart, range.previousEnd) },
    });
    const oldRevenue = previousPayments.reduce((sum, p) => sum + Number(p.finalAmount || 0), 0);
    const revenueGrowth =
      oldRevenue > 0 ? ((recentRevenue - oldRevenue) / oldRevenue) * 100 : 0;

    // Growth calculations
    const [recentTeachers, recentStudents, recentCourses] = await Promise.all([
      this.userRepo.count({
        where: { role: UserRole.TEACHER, createdAt: Between(range.currentStart, range.currentEnd) },
      }),
      this.userRepo.count({
        where: { role: UserRole.STUDENT, createdAt: Between(range.currentStart, range.currentEnd) },
      }),
      this.courseRepo.count({ where: { createdAt: Between(range.currentStart, range.currentEnd) } }),
    ]);

    const [oldTeachers, oldStudents, oldCourses] = await Promise.all([
      this.userRepo.count({
        where: {
          role: UserRole.TEACHER,
          createdAt: Between(range.previousStart, range.previousEnd),
        },
      }),
      this.userRepo.count({
        where: {
          role: UserRole.STUDENT,
          createdAt: Between(range.previousStart, range.previousEnd),
        },
      }),
      this.courseRepo.count({
        where: { createdAt: Between(range.previousStart, range.previousEnd) },
      }),
    ]);

    const teacherGrowth =
      oldTeachers > 0
        ? ((recentTeachers - oldTeachers) / oldTeachers) * 100
        : 0;
    const studentGrowth =
      oldStudents > 0
        ? ((recentStudents - oldStudents) / oldStudents) * 100
        : 0;
    const courseGrowth =
      oldCourses > 0 ? ((recentCourses - oldCourses) / oldCourses) * 100 : 0;

    // Execute secondary dashboard queries in parallel for faster response.
    const [
      revenueChart,
      weeklyStats,
      growthChart,
      categoryDistribution,
      topCourses,
      recentTransactions,
      teacherPlanSummary,
      certificateSummary,
      topTeachersByCourses,
      topStudentsByCompletion,
      topStudentsByCertificates,
      coursePerformanceTop,
    ] = await Promise.all([
      this.getRevenueChart(normalizedPeriod, range),
      this.getWeeklyStats(normalizedPeriod, range),
      this.buildGrowthChart(normalizedPeriod, range),
      this.getCategoryDistribution(range),
      this.getTopCourses(),
      this.getRecentTransactions(10, range),
      this.getTeacherPlanSummary(totalTeachers, range),
      this.getCertificateSummary(totalStudents, range),
      this.getTopTeachersByCourses(5, range),
      this.getTopStudentsByCompletion(5, range),
      this.getTopStudentsByCertificates(5, range),
      this.getCoursePerformance('DESC', 5, range),
    ]);

    return {
      totalRevenue,
      totalTeachers,
      totalStudents,
      totalCourses,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      teacherGrowth: Math.round(teacherGrowth * 10) / 10,
      studentGrowth: Math.round(studentGrowth * 10) / 10,
      courseGrowth: Math.round(courseGrowth * 10) / 10,
      revenueChart,
      topCourses,
      recentTransactions,
      weeklyStats,
      growthChart,
      categoryDistribution,
      teacherPlanSummary,
      certificateSummary,
      topTeachersByCourses,
      topStudentsByCompletion,
      topStudentsByCertificates,
      coursePerformanceTop,
    };
  }

  async getRevenueChart(period: AdminPeriod = 'month', range?: PeriodRange) {
    const effectiveRange = range ?? this.getPeriodRange(period);
    const buckets = this.buildRevenueBuckets(period, effectiveRange);

    const allPayments = await this.paymentRepo
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.createdAt >= :start AND payment.createdAt < :end', {
        start: effectiveRange.currentStart,
        end: effectiveRange.currentEnd,
      })
      .getMany();

    const labels = buckets.map((bucket) => bucket.label);
    const data = buckets.map((bucket) => {
      return allPayments
        .filter((payment) => payment.createdAt >= bucket.start && payment.createdAt < bucket.end)
        .reduce((sum, payment) => sum + Number(payment.finalAmount || 0), 0);
    });

    return { labels, data };
  }

  async getTopCourses(limit: number = 5) {
    let courses = await this.courseRepo
      .createQueryBuilder('course')
      .leftJoin('course.enrollments', 'enrollment')
      .leftJoin('course.payments', 'payment')
      .select('course.id', 'id')
      .addSelect('course.title', 'title')
      .addSelect('course.thumbnail', 'thumbnail')
      .addSelect('COUNT(DISTINCT enrollment.id)', 'enrollments')
      .addSelect('COALESCE(SUM(payment.finalAmount), 0)', 'revenue')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('course.id')
      .limit(limit)
      .getRawMany();

    courses = courses.sort(
      (a, b) => parseFloat(b.revenue || 0) - parseFloat(a.revenue || 0),
    );

    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      thumbnail: c.thumbnail,
      enrollments: parseInt(c.enrollments) || 0,
      revenue: Math.round(parseFloat(c.revenue) || 0),
    }));
  }

  async getRecentTransactions(limit: number = 10, range?: PeriodRange) {
    const qb = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.student', 'student')
      .leftJoinAndSelect('payment.course', 'course')
      .select([
        'payment.id',
        'payment.finalAmount',
        'payment.status',
        'payment.createdAt',
        'payment.paidAt',
        'payment.updatedAt',
        'student.name',
        'course.title',
      ])
      .orderBy('payment.paidAt', 'DESC', 'NULLS LAST')
      .addOrderBy('payment.createdAt', 'DESC')
      .take(limit);

    if (range) {
      qb.andWhere('payment.createdAt >= :start AND payment.createdAt < :end', {
        start: range.currentStart,
        end: range.currentEnd,
      });
    }

    const transactions = await qb.getMany();

    return transactions.map((t) => {
      const resolvedDate = t.paidAt ?? t.createdAt ?? t.updatedAt ?? null;
      const dateDisplay = resolvedDate
        ? `${String(resolvedDate.getDate()).padStart(2, '0')}/${String(
            resolvedDate.getMonth() + 1,
          ).padStart(2, '0')}/${resolvedDate.getFullYear()}`
        : null;
      return {
        id: t.id,
        studentName: t.student?.name || 'Unknown',
        courseName: t.course?.title || 'Deleted Course',
        amount: Number(t.finalAmount || 0),
        status: t.status,
        createdAt: t.createdAt,
        paidAt: t.paidAt,
        updatedAt: t.updatedAt,
        date: resolvedDate,
        dateDisplay,
      };
    });
  }

  private async getWeeklyStats(period: AdminPeriod, range: PeriodRange) {
    const stats: { day: string; activeUsers: number; newSignups: number }[] =
      [];
    const buckets = this.buildGrowthBuckets(period, range);

    const [enrollments, newUsers] = await Promise.all([
      this.enrollmentRepo.find({
        where: { createdAt: Between(range.currentStart, range.currentEnd) },
      }),
      this.userRepo.find({
        where: {
          createdAt: Between(range.currentStart, range.currentEnd),
          role: UserRole.STUDENT,
        },
      }),
    ]);

    for (const bucket of buckets) {
      const activeUsers = enrollments.filter(
        (e) => e.createdAt >= bucket.start && e.createdAt < bucket.end,
      ).length;

      const newSignups = newUsers.filter(
        (u) => u.createdAt >= bucket.start && u.createdAt < bucket.end,
      ).length;

      stats.push({
        day: bucket.label,
        activeUsers,
        newSignups,
      });
    }

    return stats;
  }

  private async buildGrowthChart(period: AdminPeriod, range: PeriodRange) {
    const teachersByPeriod = await this.getUserGrowthByPeriod(UserRole.TEACHER, period, range);
    const studentsByPeriod = await this.getUserGrowthByPeriod(UserRole.STUDENT, period, range);

    const labelSet = new Set<string>();
    teachersByPeriod.forEach((item) => labelSet.add(item.month));
    studentsByPeriod.forEach((item) => labelSet.add(item.month));

    const labels = Array.from(labelSet);

    return labels.map((month) => {
      const teacherItem = teachersByPeriod.find((t) => t.month === month);
      const studentItem = studentsByPeriod.find((s) => s.month === month);
      return {
        month,
        teachers: teacherItem?.count || 0,
        students: studentItem?.count || 0,
      };
    });
  }

  async getGrowthStats(period?: string): Promise<GrowthStats> {
    const normalizedPeriod = this.normalizePeriod(period);
    const range = this.getPeriodRange(normalizedPeriod);
    const teachersByMonth = await this.getUserGrowthByPeriod(UserRole.TEACHER, normalizedPeriod, range);
    const studentsByMonth = await this.getUserGrowthByPeriod(UserRole.STUDENT, normalizedPeriod, range);

    return {
      teachersByMonth,
      studentsByMonth,
    };
  }

  private async getUserGrowthByPeriod(
    role: UserRole,
    period: AdminPeriod,
    range: PeriodRange,
  ) {
    const users = await this.userRepo.find({
      where: { role, createdAt: Between(range.currentStart, range.currentEnd) },
      select: ['createdAt'],
    });

    const buckets = this.buildGrowthBuckets(period, range).map((bucket) => ({
      month: bucket.label,
      start: bucket.start,
      end: bucket.end,
      count: 0,
    }));

    for (const user of users) {
      const match = buckets.find(
        (bucket) => user.createdAt >= bucket.start && user.createdAt < bucket.end,
      );
      if (match) {
        match.count += 1;
      }
    }

    return buckets.map((bucket) => ({ month: bucket.month, count: bucket.count }));
  }

  async getCategoryDistribution(range?: PeriodRange): Promise<CategoryDistribution[]> {
    const total = await this.courseRepo.count({
      where: range ? { createdAt: Between(range.currentStart, range.currentEnd) } : {},
    });

    const qb = this.courseRepo
      .createQueryBuilder('course')
      .leftJoin('course.category', 'category')
      .select('category.name', 'categoryName')
      .addSelect('COUNT(course.id)', 'courseCount')
      .groupBy('category.name')
      .orderBy('"courseCount"', 'DESC');

    if (range) {
      qb.where('course.createdAt >= :start AND course.createdAt < :end', {
        start: range.currentStart,
        end: range.currentEnd,
      });
    }

    const distribution = await qb.getRawMany();

    return distribution.map((d) => ({
      categoryName: d.categoryName,
      courseCount: parseInt(d.courseCount),
      percentage:
        total > 0
          ? Math.round((parseInt(d.courseCount) / total) * 100 * 10) / 10
          : 0,
    }));
  }

  private async getTeacherPlanSummary(totalTeachers?: number, range?: PeriodRange) {
    const total =
      typeof totalTeachers === 'number'
        ? totalTeachers
        : await this.userRepo.count({ where: { role: UserRole.TEACHER } });

    const paidQb = this.instructorSubscriptionRepo
      .createQueryBuilder('sub')
      .leftJoin('sub.plan', 'plan')
      .where('sub.status = :status', {
        status: InstructorSubscriptionStatus.ACTIVE,
      })
      .andWhere('plan.price > 0');

    const freeQb = this.instructorSubscriptionRepo
      .createQueryBuilder('sub')
      .leftJoin('sub.plan', 'plan')
      .where('sub.status = :status', {
        status: InstructorSubscriptionStatus.ACTIVE,
      })
      .andWhere('plan.price = 0');

    if (range) {
      const params = { start: range.currentStart, end: range.currentEnd };
      paidQb.andWhere('sub.createdAt >= :start AND sub.createdAt < :end', params);
      freeQb.andWhere('sub.createdAt >= :start AND sub.createdAt < :end', params);
    }

    const [paid, free] = await Promise.all([paidQb.getCount(), freeQb.getCount()]);

    const unsubscribed = Math.max(total - paid - free, 0);
    const payingRate = total > 0 ? Math.round((paid / total) * 1000) / 10 : 0;

    return {
      paid,
      free,
      unsubscribed,
      total,
      payingRate,
    };
  }

  private async getCertificateSummary(totalStudents?: number, range?: PeriodRange) {
    const total =
      typeof totalStudents === 'number'
        ? totalStudents
        : await this.userRepo.count({ where: { role: UserRole.STUDENT } });

    const withCertQb = this.certificateRepo
      .createQueryBuilder('cert')
      .select('COUNT(DISTINCT cert."studentId")', 'withCertificate');

    const totalCertQb = this.certificateRepo
      .createQueryBuilder('cert')
      .select('COUNT(*)', 'total');

    if (range) {
      const params = { start: range.currentStart, end: range.currentEnd };
      withCertQb.where('cert.createdAt >= :start AND cert.createdAt < :end', params);
      totalCertQb.where('cert.createdAt >= :start AND cert.createdAt < :end', params);
    }

    const [{ withCertificate = 0 } = { withCertificate: 0 }, totalCertRow] = await Promise.all([
      withCertQb.getRawOne(),
      totalCertQb.getRawOne(),
    ]);

    const totalCertificates = Number(totalCertRow?.total || 0);

    const withoutCertificate = Math.max(total - Number(withCertificate || 0), 0);

    return {
      withCertificate: Number(withCertificate || 0),
      withoutCertificate,
      totalCertificates,
    };
  }

  private async getTopTeachersByCourses(limit: number = 5, range?: PeriodRange) {
    const qb = this.courseRepo
      .createQueryBuilder('course')
      .leftJoin('course.teacher', 'teacher')
      .leftJoin('course.enrollments', 'enrollment')
      .select('teacher.id', 'teacherId')
      .addSelect('teacher.name', 'teacherName')
      .addSelect('COUNT(course.id)', 'courseCount')
      .addSelect('COUNT(DISTINCT enrollment.id)', 'studentCount')
      .where('teacher.id IS NOT NULL')
      .groupBy('teacher.id')
      .addGroupBy('teacher.name')
      .orderBy('"courseCount"', 'DESC')
      .limit(limit);

    if (range) {
      qb.andWhere('course.createdAt >= :start AND course.createdAt < :end', {
        start: range.currentStart,
        end: range.currentEnd,
      });
    }

    const rows = await qb.getRawMany();

    return rows.map((row) => ({
      teacherId: row.teacherId,
      teacherName: row.teacherName,
      courseCount: parseInt(row.courseCount) || 0,
      studentCount: parseInt(row.studentCount) || 0,
    }));
  }

  private async getTopStudentsByCompletion(limit: number = 5, range?: PeriodRange) {
    const qb = this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .leftJoin('enrollment.student', 'student')
      .leftJoin('enrollment.certificate', 'certificate')
      .select('student.id', 'studentId')
      .addSelect('student.name', 'studentName')
      .addSelect(
        "SUM(CASE WHEN enrollment.status = :completed THEN 1 ELSE 0 END)",
        'completedCourses',
      )
      .addSelect('COUNT(certificate.id)', 'certificates')
      .where('student.id IS NOT NULL')
      .setParameter('completed', EnrollmentStatus.COMPLETED)
      .groupBy('student.id')
      .addGroupBy('student.name')
      .orderBy('"completedCourses"', 'DESC')
      .addOrderBy('"certificates"', 'DESC')
      .limit(limit);

    if (range) {
      qb.andWhere('enrollment.createdAt >= :start AND enrollment.createdAt < :end', {
        start: range.currentStart,
        end: range.currentEnd,
      });
    }

    const rows = await qb.getRawMany();

    return rows.map((row) => ({
      studentId: row.studentId,
      studentName: row.studentName,
      completedCourses: parseInt(row.completedCourses) || 0,
      certificates: parseInt(row.certificates) || 0,
    }));
  }

  private async getTopStudentsByCertificates(limit: number = 5, range?: PeriodRange) {
    const qb = this.certificateRepo
      .createQueryBuilder('cert')
      .leftJoin('cert.student', 'student')
      .leftJoin('cert.enrollment', 'enrollment')
      .select('student.id', 'studentId')
      .addSelect('student.name', 'studentName')
      .addSelect('COUNT(cert.id)', 'certificateCount')
      .addSelect(
        "COUNT(DISTINCT CASE WHEN enrollment.status = :completed THEN enrollment.id END)",
        'completedCourses',
      )
      .where('student.id IS NOT NULL')
      .setParameter('completed', EnrollmentStatus.COMPLETED)
      .groupBy('student.id')
      .addGroupBy('student.name')
      .orderBy('"certificateCount"', 'DESC')
      .addOrderBy('student.name', 'ASC')
      .limit(limit);

    if (range) {
      qb.andWhere('cert.createdAt >= :start AND cert.createdAt < :end', {
        start: range.currentStart,
        end: range.currentEnd,
      });
    }

    const rows = await qb.getRawMany();

    return rows.map((row) => ({
      studentId: row.studentId,
      studentName: row.studentName,
      certificateCount: parseInt(row.certificateCount) || 0,
      completedCourses: parseInt(row.completedCourses) || 0,
    }));
  }

  // ===== Revenue Reports =====
  async getRevenueReport(period?: string): Promise<RevenueReport> {
    const normalizedPeriod = this.normalizePeriod(period);
    const range = this.getPeriodRange(normalizedPeriod);
    const completedPayments = await this.paymentRepo.find({
      where: { status: PaymentStatus.COMPLETED, createdAt: Between(range.currentStart, range.currentEnd) },
      relations: ['course', 'course.teacher', 'course.category'],
    });

    const totalRevenue = Math.round(
      completedPayments.reduce((sum, p) => sum + Number(p.finalAmount || 0), 0),
    );
    const platformRevenue = Math.round(totalRevenue * 0.3);
    const teacherRevenue = Math.round(totalRevenue * 0.7);

    // Revenue by month
    const revenueByMonth = await this.getRevenueByMonth(normalizedPeriod, range);

    // Revenue by teacher
    const revenueByTeacher = await this.getRevenueByTeacher(range);

    // Revenue by category
    const revenueByCategory = await this.getRevenueByCategory(range);

    // Average order value
    const averageOrderValue =
      completedPayments.length > 0
        ? Math.round(totalRevenue / completedPayments.length)
        : 0;

    // Refund rate
    const refundedPayments = await this.paymentRepo.count({
      where: { status: PaymentStatus.REFUNDED },
    });
    const totalPayments = await this.paymentRepo.count();
    const refundRate =
      totalPayments > 0
        ? Math.round((refundedPayments / totalPayments) * 1000) / 10
        : 0;

    return {
      totalRevenue,
      platformRevenue,
      teacherRevenue,
      revenueByMonth,
      revenueByTeacher,
      revenueByCategory,
      averageOrderValue,
      refundRate,
    };
  }

  private async getRevenueByMonth(period: AdminPeriod, range: PeriodRange): Promise<MonthlyRevenue[]> {
    const buckets = this.buildRevenueBuckets(period, range);
    const rows = await this.paymentRepo
      .createQueryBuilder('payment')
      .select(['payment.createdAt', 'payment.finalAmount'])
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.createdAt >= :start AND payment.createdAt < :end', {
        start: range.currentStart,
        end: range.currentEnd,
      })
      .getMany();

    const result = buckets.map((bucket, index) => {
      const bucketRows = rows.filter(
        (payment) => payment.createdAt >= bucket.start && payment.createdAt < bucket.end,
      );
      const revenue = Math.round(bucketRows.reduce((sum, payment) => sum + Number(payment.finalAmount || 0), 0));
      const orders = bucketRows.length;
      return {
        month: bucket.label,
        revenue,
        orders,
        growth: 0,
        __index: index,
      };
    });

    return result.map((item, index, arr) => {
      const prev = arr[index - 1]?.revenue ?? item.revenue;
      const growth = prev > 0 ? ((item.revenue - prev) / prev) * 100 : 0;
      return {
        month: item.month,
        revenue: item.revenue,
        orders: item.orders,
        growth: Math.round(growth * 10) / 10,
      };
    });
  }

  private async getRevenueByTeacher(range: PeriodRange): Promise<TeacherRevenue[]> {
    let result = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment.course', 'course')
      .leftJoin('course.teacher', 'teacher')
      .select('teacher.id', 'teacherId')
      .addSelect('teacher.name', 'teacherName')
      .addSelect('teacher.email', 'teacherEmail')
      .addSelect('SUM(payment.finalAmount) * 0.7', 'totalRevenue')
      .addSelect('COUNT(DISTINCT course.id)', 'courseCount')
      .addSelect('COUNT(DISTINCT payment.studentId)', 'studentCount')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.createdAt >= :start AND payment.createdAt < :end', {
        start: range.currentStart,
        end: range.currentEnd,
      })
      .groupBy('teacher.id')
      .addGroupBy('teacher.name')
      .addGroupBy('teacher.email')
      .getRawMany();

    result = result.sort(
      (a, b) =>
        parseFloat(b.totalRevenue || 0) - parseFloat(a.totalRevenue || 0),
    );

    return result.map((r) => ({
      teacherId: r.teacherId,
      teacherName: r.teacherName,
      teacherEmail: r.teacherEmail,
      totalRevenue: Math.round(parseFloat(r.totalRevenue) || 0),
      courseCount: parseInt(r.courseCount),
      studentCount: parseInt(r.studentCount),
    }));
  }

  private async getRevenueByCategory(range: PeriodRange): Promise<CategoryRevenue[]> {
    const totalRevenue = await this.paymentRepo
      .createQueryBuilder('payment')
      .select('SUM(payment.finalAmount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.createdAt >= :start AND payment.createdAt < :end', {
        start: range.currentStart,
        end: range.currentEnd,
      })
      .getRawOne();

    const total = Math.round(parseFloat(totalRevenue?.total || '0'));

    let result = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment.course', 'course')
      .leftJoin('course.category', 'category')
      .select('category.name', 'categoryName')
      .addSelect('SUM(payment.finalAmount)', 'revenue')
      .addSelect('COUNT(*)', 'orderCount')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.createdAt >= :start AND payment.createdAt < :end', {
        start: range.currentStart,
        end: range.currentEnd,
      })
      .groupBy('category.name')
      .getRawMany();

    result = result.sort(
      (a, b) => parseFloat(b.revenue || 0) - parseFloat(a.revenue || 0),
    );

    return result.map((r) => {
      const revenue = Math.round(parseFloat(r.revenue) || 0);
      return {
        categoryName: r.categoryName,
        revenue,
        orderCount: parseInt(r.orderCount),
        percentage:
          total > 0 ? Math.round((revenue / total) * 100 * 10) / 10 : 0,
      };
    });
  }

  // ===== User Reports =====
  async getUserReport(period?: string): Promise<UserReport> {
    const normalizedPeriod = this.normalizePeriod(period);
    const range = this.getPeriodRange(normalizedPeriod);

    const totalUsers = await this.userRepo.count({
      where: { createdAt: Between(range.currentStart, range.currentEnd) },
    });
    const activeUsers = await this.userRepo.count({
      where: { createdAt: Between(range.currentStart, range.currentEnd) },
    });
    const newUsers = await this.userRepo.count({
      where: { createdAt: Between(range.currentStart, range.currentEnd) },
    });

    const usersByRole = await this.getUsersByRole(range);
    const userGrowth = await this.getUserGrowthReport(normalizedPeriod, range);
    const topStudents = await this.getTopStudents(range);
    const topTeachers = await this.getTopTeachers(range);

    return {
      totalUsers,
      activeUsers,
      newUsers,
      usersByRole,
      userGrowth,
      topStudents,
      topTeachers,
    };
  }

  private async getUsersByRole(range?: PeriodRange): Promise<RoleDistribution[]> {
    const total = await this.userRepo.count({
      where: range ? { createdAt: Between(range.currentStart, range.currentEnd) } : {},
    });

    const qb = this.userRepo
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role');

    if (range) {
      qb.where('user.createdAt >= :start AND user.createdAt < :end', {
        start: range.currentStart,
        end: range.currentEnd,
      });
    }

    const result = await qb.getRawMany();

    return result.map((r) => ({
      role: r.role,
      count: parseInt(r.count),
      percentage:
        total > 0 ? Math.round((parseInt(r.count) / total) * 100 * 10) / 10 : 0,
    }));
  }

  private async getUserGrowthReport(
    period: AdminPeriod,
    range: PeriodRange,
  ): Promise<UserGrowth[]> {
    const buckets = this.buildGrowthBuckets(period, range);
    const users = await this.userRepo.find({
      where: { createdAt: Between(range.currentStart, range.currentEnd) },
      select: ['createdAt'],
    });

    return buckets.map((bucket) => {
      const newUsers = users.filter(
        (user) => user.createdAt >= bucket.start && user.createdAt < bucket.end,
      ).length;
      return {
        period: bucket.label,
        newUsers,
        activeUsers: newUsers,
      };
    });
  }

  private async getTopStudents(range?: PeriodRange): Promise<TopStudent[]> {
    // Use payments (completed only) as the source of spending, with enrollments joined for completion stats
    let result = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment.student', 'student')
      .leftJoin('payment.course', 'course')
      .leftJoin(Enrollment, 'enrollment', 'enrollment.studentId = student.id')
      .select('student.id', 'studentId')
      .addSelect('student.name', 'studentName')
      .addSelect('student.email', 'studentEmail')
      .addSelect('COUNT(DISTINCT payment.courseId)', 'coursesEnrolled')
      .addSelect('COALESCE(SUM(payment.finalAmount), 0)', 'totalSpent')
      .addSelect(
        'COALESCE(ROUND(SUM(CASE WHEN enrollment.completedAt IS NOT NULL THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(enrollment.id), 0) * 100, 1), 0)',
        'completionRate',
      )
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere(
        range ? 'payment.createdAt >= :start AND payment.createdAt < :end' : '1=1',
        range ? { start: range.currentStart, end: range.currentEnd } : {},
      )
      .groupBy('student.id')
      .addGroupBy('student.name')
      .addGroupBy('student.email')
      .limit(10)
      .getRawMany();

    result = result.sort(
      (a, b) => parseFloat(b.totalSpent || 0) - parseFloat(a.totalSpent || 0),
    );

    return result.map((r) => ({
      studentId: r.studentId,
      studentName: r.studentName,
      studentEmail: r.studentEmail,
      coursesEnrolled: parseInt(r.coursesEnrolled),
      totalSpent: parseFloat(r.totalSpent) || 0,
      completionRate: parseFloat(r.completionRate) || 0,
    }));
  }

  private async getTopTeachers(range?: PeriodRange): Promise<TopTeacher[]> {
    let result = await this.courseRepo
      .createQueryBuilder('course')
      .leftJoin('course.teacher', 'teacher')
      .leftJoin('course.enrollments', 'enrollment')
      .leftJoin('course.payments', 'payment')
      .leftJoin('course.reviews', 'review')
      .select('teacher.id', 'teacherId')
      .addSelect('teacher.name', 'teacherName')
      .addSelect('teacher.email', 'teacherEmail')
      .addSelect('COUNT(DISTINCT course.id)', 'coursesCreated')
      .addSelect('COUNT(DISTINCT enrollment.id)', 'totalStudents')
      .addSelect('COALESCE(SUM(payment.finalAmount), 0) * 0.7', 'totalRevenue')
      .addSelect('COALESCE(AVG(review.rating), 0)', 'averageRating')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere(
        range ? 'payment.createdAt >= :start AND payment.createdAt < :end' : '1=1',
        range ? { start: range.currentStart, end: range.currentEnd } : {},
      )
      .groupBy('teacher.id')
      .addGroupBy('teacher.name')
      .addGroupBy('teacher.email')
      .limit(10)
      .getRawMany();

    result = result.sort(
      (a, b) =>
        parseFloat(b.totalRevenue || 0) - parseFloat(a.totalRevenue || 0),
    );

    return result.map((r) => ({
      teacherId: r.teacherId,
      teacherName: r.teacherName,
      teacherEmail: r.teacherEmail,
      coursesCreated: parseInt(r.coursesCreated),
      totalStudents: parseInt(r.totalStudents),
      totalRevenue: Math.round(parseFloat(r.totalRevenue) || 0),
      averageRating: Math.round(parseFloat(r.averageRating) * 10) / 10,
    }));
  }

  // ===== Performance Reports =====
  async getPerformanceReport(period?: string): Promise<PerformanceReport> {
    const normalizedPeriod = this.normalizePeriod(period);
    const range = this.getPeriodRange(normalizedPeriod);

    const topPerformingCourses = await this.getCoursePerformance('DESC', 10, range);
    const lowPerformingCourses = await this.getCoursePerformance('ASC', 10, range);
    const completionRates = await this.getCompletionRates(range);
    const engagementMetrics = await this.getEngagementMetrics();

    return {
      topPerformingCourses,
      lowPerformingCourses,
      completionRates,
      engagementMetrics,
    };
  }

  private async getCoursePerformance(
    order: 'ASC' | 'DESC',
    limit: number,
    range?: PeriodRange,
  ): Promise<CoursePerformance[]> {
    const qb = this.courseRepo
      .createQueryBuilder('course')
      .leftJoin('course.teacher', 'teacher')
      .leftJoin('course.enrollments', 'enrollment')
      .leftJoin('course.payments', 'payment')
      .leftJoin('course.reviews', 'review')
      .select('course.id', 'courseId')
      .addSelect('course.title', 'courseTitle')
      .addSelect('teacher.name', 'teacherName')
      .addSelect('COUNT(DISTINCT enrollment.id)', 'enrollments')
      .addSelect('COALESCE(SUM(payment.finalAmount), 0)', 'revenue')
      .addSelect('COALESCE(AVG(review.rating), 0)', 'averageRating')
      .addSelect(
        'ROUND(COUNT(DISTINCT CASE WHEN enrollment.completedAt IS NOT NULL THEN enrollment.id END)::numeric / NULLIF(COUNT(DISTINCT enrollment.id), 0) * 100)',
        'completionRate',
      )
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('course.id')
      .addGroupBy('course.title')
      .addGroupBy('teacher.name')
      .orderBy('revenue', order)
      .limit(limit);

    if (range) {
      qb.andWhere('payment.createdAt >= :start AND payment.createdAt < :end', {
        start: range.currentStart,
        end: range.currentEnd,
      });
    }

    const result = await qb.getRawMany();

    return result.map((r) => ({
      courseId: r.courseId,
      courseTitle: r.courseTitle,
      teacherName: r.teacherName,
      enrollments: parseInt(r.enrollments) || 0,
      revenue: Math.round(parseFloat(r.revenue) || 0),
      averageRating: Math.round(parseFloat(r.averageRating) * 10) / 10,
      completionRate: parseFloat(r.completionRate) || 0,
    }));
  }

  private async getCompletionRates(range?: PeriodRange): Promise<CompletionRate[]> {
    const qb = this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .leftJoin('enrollment.course', 'course')
      .leftJoin('course.category', 'category')
      .select('category.name', 'categoryName')
      .addSelect('COUNT(*)', 'totalEnrollments')
      .addSelect(
        'COUNT(CASE WHEN enrollment.completedAt IS NOT NULL THEN 1 END)',
        'completedEnrollments',
      )
      .groupBy('category.name');

    if (range) {
      qb.where('enrollment.createdAt >= :start AND enrollment.createdAt < :end', {
        start: range.currentStart,
        end: range.currentEnd,
      });
    }

    const result = await qb.getRawMany();

    return result.map((r) => {
      const total = parseInt(r.totalEnrollments);
      const completed = parseInt(r.completedEnrollments);
      const rate = total > 0 ? (completed / total) * 100 : 0;

      return {
        categoryName: r.categoryName,
        totalEnrollments: total,
        completedEnrollments: completed,
        completionRate: Math.round(rate * 10) / 10,
      };
    });
  }

  async getCourses() {
    const courses = await this.courseRepo
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.teacher', 'teacher')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.enrollments', 'enrollments')
      .leftJoinAndSelect('course.lessons', 'lessons')
      .leftJoinAndSelect('course.reviews', 'reviews')
      .where('course.status != :draftStatus', { draftStatus: CourseStatus.DRAFT })
      .orderBy('course.createdAt', 'DESC')
      .getMany();

    return courses.map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      price: course.price,
      status: course.status,
      createdAt: course.createdAt,
      thumbnail: course.thumbnail,
      teacher: course.teacher
        ? {
            id: course.teacher.id,
            firstName: course.teacher.name.split(' ')[0] || '',
            lastName: course.teacher.name.split(' ').slice(1).join(' ') || '',
            email: course.teacher.email,
          }
        : null,
      category: course.category
        ? {
            id: course.category.id,
            name: course.category.name,
          }
        : null,
      enrollmentCount: course.enrollments?.length || 0,
      lessonCount: course.lessons?.length || 0,
      averageRating:
        course.reviews?.length > 0
          ? course.reviews.reduce((sum, r) => sum + r.rating, 0) /
            course.reviews.length
          : 0,
      reviewCount: course.reviews?.length || 0,
      revenue: 0, // TODO: calculate from payments
      rejectionReason: course.rejectionReason,
    }));
  }

  private async getEngagementMetrics(): Promise<EngagementMetrics> {
    // These are placeholder calculations - would need tracking data for accurate metrics
    const avgRating = await this.reviewRepo
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .getRawOne();

    return {
      averageTimePerCourse: 8.5, // Placeholder - needs time tracking
      averageLessonsCompleted: 12.3, // Placeholder - needs lesson progress tracking
      averageQuizScore: parseFloat(avgRating?.avg || '0') * 20, // Convert 5-star to 100 scale
      discussionParticipation: 35.7, // Placeholder - needs discussion analytics
    };
  }
}
