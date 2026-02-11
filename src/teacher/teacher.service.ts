import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Course, CourseStatus } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { Review } from '../reviews/entities/review.entity';
import { TeacherDashboardStats, EarningsData } from './dto/teacher-stats.dto';
import { EnrollmentStatus } from '../enrollments/entities/enrollment.entity';

@Injectable()
export class TeacherService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
  ) {}

  async getDashboardStats(teacherId: string): Promise<TeacherDashboardStats> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

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
    const totalRevenue = payments.reduce(
      (sum, p) => sum + Number(p.finalAmount || 0),
      0,
    );

    // Recent revenue for growth
    const recentRevenue = payments
      .filter((p) => p.createdAt >= thirtyDaysAgo)
      .reduce((sum, p) => sum + Number(p.finalAmount || 0), 0);
    const oldRevenue = payments
      .filter((p) => p.createdAt >= sixtyDaysAgo && p.createdAt < thirtyDaysAgo)
      .reduce((sum, p) => sum + Number(p.finalAmount || 0), 0);
    const revenueGrowth =
      oldRevenue > 0 ? ((recentRevenue - oldRevenue) / oldRevenue) * 100 : 0;

    // Total students (unique enrollments)
    const totalStudents = await this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .select('COUNT(DISTINCT enrollment.studentId)', 'count')
      .where('enrollment.courseId IN (:...courseIds)', { courseIds })
      .getRawOne();

    const totalEnrollments = await this.enrollmentRepo.count({
      where: { courseId: In(courseIds) },
    });

    const completionAgg = await this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .select('AVG(enrollment.progress)', 'avg')
      .where('enrollment.courseId IN (:...courseIds)', { courseIds })
      .getRawOne();

    // Recent students for growth
    const [recentStudents, oldStudents] = await Promise.all([
      this.enrollmentRepo
        .createQueryBuilder('enrollment')
        .select('COUNT(DISTINCT enrollment.studentId)', 'count')
        .where('enrollment.courseId IN (:...courseIds)', { courseIds })
        .andWhere('enrollment.createdAt >= :date', { date: thirtyDaysAgo })
        .getRawOne(),
      this.enrollmentRepo
        .createQueryBuilder('enrollment')
        .select('COUNT(DISTINCT enrollment.studentId)', 'count')
        .where('enrollment.courseId IN (:...courseIds)', { courseIds })
        .andWhere('enrollment.createdAt >= :start', { start: sixtyDaysAgo })
        .andWhere('enrollment.createdAt < :end', { end: thirtyDaysAgo })
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
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    const revenueChart = await this.getRevenueChart(teacherId, 12);

    const studentChart = await this.getEnrollmentChart(teacherId, 12);

    const weeklyPerformance = await this.getWeeklyPerformance(teacherId);

    const courseDistribution = this.buildCourseDistribution(courses);

    const enrollments = await this.enrollmentRepo.find({
      where: { courseId: In(courseIds) },
    });

    const coursePerformance = courses.map((course) => {
      const courseEnrollments = enrollments.filter(
        (e) => e.courseId === course.id,
      );
      const coursePayments = payments.filter((p) => p.courseId === course.id);
      const courseReviews = reviews.filter((r) => r.courseId === course.id);

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

  async getRevenueChart(teacherId: string, months: number = 12) {
    const labels: string[] = [];
    const data: number[] = [];
    const now = new Date();

    const courses = await this.courseRepo.find({ where: { teacherId } });
    const courseIds = courses.map((c) => c.id);

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

  async getEnrollmentChart(teacherId: string, months: number = 12) {
    const labels: string[] = [];
    const data: number[] = [];
    const now = new Date();

    const courses = await this.courseRepo.find({ where: { teacherId } });
    const courseIds = courses.map((c) => c.id);

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

  async getWeeklyPerformance(teacherId: string) {
    const now = new Date();
    const courses = await this.courseRepo.find({ where: { teacherId } });
    const courseIds = courses.map((c) => c.id);

    const results: { day: string; revenue: number }[] = [];
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

    if (courseIds.length === 0) {
      return { data: [], total: 0 };
    }

    const enrollments = await this.enrollmentRepo.find({
      where: { courseId: In(courseIds) },
      relations: ['student', 'course'],
      order: { createdAt: 'DESC' },
    });

    const data = enrollments.map((e) => ({
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
    const courses = await this.courseRepo.find({ where: { teacherId } });
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

    const coursesList = courses.map((c) => ({ id: c.id, name: c.title }));

    const mapped = reviews.map((r) => ({
      id: r.id,
      courseId: r.courseId,
      courseName: r.course?.title || '',
      studentName: r.student?.name || 'N/A',
      studentAvatar: r.student?.avatar || '',
      studentEmail: r.student?.email || '',
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      helpful: r.helpfulCount,
      response: r.teacherReply || '',
      responseDate: r.repliedAt || undefined,
    }));

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
      response: review.teacherReply,
      responseDate: review.repliedAt,
    };
  }
}
