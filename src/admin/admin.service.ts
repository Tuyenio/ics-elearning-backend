import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Category } from '../categories/entities/category.entity';
import { Review } from '../reviews/entities/review.entity';
import { DashboardStats, GrowthStats, CategoryDistribution } from './dto/dashboard-stats.dto';
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
  EngagementMetrics
} from './dto/admin-reports.dto';

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
  ) {}

  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Total counts
    const [totalTeachers, totalStudents, totalCourses] = await Promise.all([
      this.userRepo.count({ where: { role: UserRole.TEACHER } }),
      this.userRepo.count({ where: { role: UserRole.STUDENT } }),
      this.courseRepo.count(),
    ]);

    // Revenue calculations
    const completedPayments = await this.paymentRepo.find({
      where: { status: PaymentStatus.COMPLETED },
    });
    const totalRevenue = completedPayments.reduce((sum, p) => sum + Number(p.finalAmount || 0), 0);

    const recentRevenue = completedPayments
      .filter(p => p.createdAt >= thirtyDaysAgo)
      .reduce((sum, p) => sum + Number(p.finalAmount || 0), 0);
    const oldRevenue = completedPayments
      .filter(p => p.createdAt >= sixtyDaysAgo && p.createdAt < thirtyDaysAgo)
      .reduce((sum, p) => sum + Number(p.finalAmount || 0), 0);
    const revenueGrowth = oldRevenue > 0 ? ((recentRevenue - oldRevenue) / oldRevenue) * 100 : 0;

    // Growth calculations
    const [recentTeachers, recentStudents, recentCourses] = await Promise.all([
      this.userRepo.count({ where: { role: UserRole.TEACHER, createdAt: MoreThan(thirtyDaysAgo) } }),
      this.userRepo.count({ where: { role: UserRole.STUDENT, createdAt: MoreThan(thirtyDaysAgo) } }),
      this.courseRepo.count({ where: { createdAt: MoreThan(thirtyDaysAgo) } }),
    ]);

    const [oldTeachers, oldStudents, oldCourses] = await Promise.all([
      this.userRepo.count({ where: { role: UserRole.TEACHER, createdAt: Between(sixtyDaysAgo, thirtyDaysAgo) } }),
      this.userRepo.count({ where: { role: UserRole.STUDENT, createdAt: Between(sixtyDaysAgo, thirtyDaysAgo) } }),
      this.courseRepo.count({ where: { createdAt: Between(sixtyDaysAgo, thirtyDaysAgo) } }),
    ]);

    const teacherGrowth = oldTeachers > 0 ? ((recentTeachers - oldTeachers) / oldTeachers) * 100 : 0;
    const studentGrowth = oldStudents > 0 ? ((recentStudents - oldStudents) / oldStudents) * 100 : 0;
    const courseGrowth = oldCourses > 0 ? ((recentCourses - oldCourses) / oldCourses) * 100 : 0;

    // Revenue chart (last 7 days)
    const revenueChart = await this.getRevenueChart(12);

    // Weekly activity stats
    const weeklyStats = await this.getWeeklyStats();

    // Growth chart (teachers vs students by month)
    const growthChart = await this.buildGrowthChart();

    // Category distribution
    const categoryDistribution = await this.getCategoryDistribution();

    // Top courses
    const topCourses = await this.getTopCourses();

    // Recent transactions
    const recentTransactions = await this.getRecentTransactions();

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
    };
  }

  async getRevenueChart(days: number = 7) {
    const labels: string[] = [];
    const data: number[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);

      const monthRevenue = await this.paymentRepo
        .createQueryBuilder('payment')
        .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .andWhere('payment.createdAt >= :start', { start: date })
        .andWhere('payment.createdAt < :end', { end: nextDate })
        .getMany();

      const total = monthRevenue.reduce((sum, p) => sum + Number(p.finalAmount || 0), 0);

      labels.push(date.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }));
      data.push(total);
    }

    return { labels, data };
  }

  async getTopCourses(limit: number = 5) {
    const courses = await this.courseRepo
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
      .orderBy('revenue', 'DESC')
      .limit(limit)
      .getRawMany();

    return courses.map(c => ({
      id: c.id,
      title: c.title,
      thumbnail: c.thumbnail,
      enrollments: parseInt(c.enrollments) || 0,
      revenue: parseFloat(c.revenue) || 0,
    }));
  }

  async getRecentTransactions(limit: number = 10) {
    const transactions = await this.paymentRepo.find({
      relations: ['student', 'course'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return transactions.map(t => ({
      id: t.id,
      studentName: t.student.name,
      courseName: t.course.title,
      amount: Number(t.finalAmount || 0),
      status: t.status,
      createdAt: t.createdAt,
    }));
  }

  private async getWeeklyStats() {
    const stats: { day: string; activeUsers: number; newSignups: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(now.getDate() - i);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);

      const [activeUsers, newSignups] = await Promise.all([
        this.enrollmentRepo.count({ where: { createdAt: Between(start, end) } }),
        this.userRepo.count({ where: { createdAt: Between(start, end), role: UserRole.STUDENT } }),
      ]);

      stats.push({
        day: start.toLocaleDateString('vi-VN', { weekday: 'short' }),
        activeUsers,
        newSignups,
      });
    }

    return stats;
  }

  private async buildGrowthChart() {
    const teachersByMonth = await this.getUserGrowthByMonth(UserRole.TEACHER);
    const studentsByMonth = await this.getUserGrowthByMonth(UserRole.STUDENT);

    const monthSet = new Set<string>();
    teachersByMonth.forEach(item => monthSet.add(item.month));
    studentsByMonth.forEach(item => monthSet.add(item.month));

    const months = Array.from(monthSet).sort();

    return months.map(month => {
      const teacherItem = teachersByMonth.find(t => t.month === month);
      const studentItem = studentsByMonth.find(s => s.month === month);
      return {
        month,
        teachers: teacherItem?.count || 0,
        students: studentItem?.count || 0,
      };
    });
  }

  async getGrowthStats(): Promise<GrowthStats> {
    const teachersByMonth = await this.getUserGrowthByMonth(UserRole.TEACHER);
    const studentsByMonth = await this.getUserGrowthByMonth(UserRole.STUDENT);

    return {
      teachersByMonth,
      studentsByMonth,
    };
  }

  private async getUserGrowthByMonth(role: UserRole) {
    const users = await this.userRepo
      .createQueryBuilder('user')
      .select("TO_CHAR(user.createdAt, 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'count')
      .where('user.role = :role', { role })
      .groupBy('month')
      .orderBy('month', 'ASC')
      .limit(12)
      .getRawMany();

    return users.map(u => ({
      month: u.month,
      count: parseInt(u.count),
    }));
  }

  async getCategoryDistribution(): Promise<CategoryDistribution[]> {
    const total = await this.courseRepo.count();
    
    const distribution = await this.courseRepo
      .createQueryBuilder('course')
      .leftJoin('course.category', 'category')
      .select('category.name', 'categoryName')
      .addSelect('COUNT(course.id)', 'courseCount')
      .groupBy('category.name')
      .orderBy('COUNT(course.id)', 'DESC')
      .getRawMany();

    return distribution.map(d => ({
      categoryName: d.categoryName,
      courseCount: parseInt(d.courseCount),
      percentage: total > 0 ? Math.round((parseInt(d.courseCount) / total) * 100 * 10) / 10 : 0,
    }));
  }

  // ===== Revenue Reports =====
  async getRevenueReport(): Promise<RevenueReport> {
    const completedPayments = await this.paymentRepo.find({
      where: { status: PaymentStatus.COMPLETED },
      relations: ['course', 'course.teacher', 'course.category'],
    });

    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.finalAmount, 0);
    const platformRevenue = totalRevenue * 0.3;
    const teacherRevenue = totalRevenue * 0.7;

    // Revenue by month
    const revenueByMonth = await this.getRevenueByMonth();

    // Revenue by teacher
    const revenueByTeacher = await this.getRevenueByTeacher();

    // Revenue by category
    const revenueByCategory = await this.getRevenueByCategory();

    // Average order value
    const averageOrderValue = completedPayments.length > 0 ? totalRevenue / completedPayments.length : 0;

    // Refund rate
    const refundedPayments = await this.paymentRepo.count({ where: { status: PaymentStatus.REFUNDED } });
    const totalPayments = await this.paymentRepo.count();
    const refundRate = totalPayments > 0 ? (refundedPayments / totalPayments) * 100 : 0;

    return {
      totalRevenue,
      platformRevenue,
      teacherRevenue,
      revenueByMonth,
      revenueByTeacher,
      revenueByCategory,
      averageOrderValue: Math.round(averageOrderValue),
      refundRate: Math.round(refundRate * 10) / 10,
    };
  }

  private async getRevenueByMonth(): Promise<MonthlyRevenue[]> {
    const result = await this.paymentRepo
      .createQueryBuilder('payment')
      .select("TO_CHAR(payment.createdAt, 'YYYY-MM')", 'month')
      .addSelect('SUM(payment.finalAmount)', 'revenue')
      .addSelect('COUNT(*)', 'orders')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('month')
      .orderBy('month', 'DESC')
      .limit(12)
      .getRawMany();

    const monthlyData = result.map((r, index) => {
      const nextMonth = result[index + 1];
      const growth = nextMonth 
        ? ((parseFloat(r.revenue) - parseFloat(nextMonth.revenue)) / parseFloat(nextMonth.revenue)) * 100
        : 0;

      return {
        month: r.month,
        revenue: parseFloat(r.revenue) || 0,
        orders: parseInt(r.orders),
        growth: Math.round(growth * 10) / 10,
      };
    });

    return monthlyData.reverse();
  }

  private async getRevenueByTeacher(): Promise<TeacherRevenue[]> {
    const result = await this.paymentRepo
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
      .groupBy('teacher.id')
      .addGroupBy('teacher.name')
      .addGroupBy('teacher.email')
      .orderBy('totalRevenue', 'DESC')
      .getRawMany();

    return result.map(r => ({
      teacherId: r.teacherId,
      teacherName: r.teacherName,
      teacherEmail: r.teacherEmail,
      totalRevenue: Math.round(parseFloat(r.totalRevenue) || 0),
      courseCount: parseInt(r.courseCount),
      studentCount: parseInt(r.studentCount),
    }));
  }

  private async getRevenueByCategory(): Promise<CategoryRevenue[]> {
    const totalRevenue = await this.paymentRepo
      .createQueryBuilder('payment')
      .select('SUM(payment.finalAmount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();

    const total = parseFloat(totalRevenue?.total || '0');

    const result = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment.course', 'course')
      .leftJoin('course.category', 'category')
      .select('category.name', 'categoryName')
      .addSelect('SUM(payment.finalAmount)', 'revenue')
      .addSelect('COUNT(*)', 'orderCount')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('category.name')
      .orderBy('revenue', 'DESC')
      .getRawMany();

    return result.map(r => ({
      categoryName: r.categoryName,
      revenue: parseFloat(r.revenue) || 0,
      orderCount: parseInt(r.orderCount),
      percentage: total > 0 ? Math.round((parseFloat(r.revenue) / total) * 100 * 10) / 10 : 0,
    }));
  }

  // ===== User Reports =====
  async getUserReport(): Promise<UserReport> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalUsers = await this.userRepo.count();
    // For activeUsers, we count users who created accounts or enrolled in courses recently
    // In a real app, you'd track lastLoginAt field
    const activeUsers = await this.userRepo.count({ 
      where: { createdAt: MoreThan(thirtyDaysAgo) } 
    });
    const newUsers = await this.userRepo.count({ 
      where: { createdAt: MoreThan(thirtyDaysAgo) } 
    });

    const usersByRole = await this.getUsersByRole();
    const userGrowth = await this.getUserGrowthReport();
    const topStudents = await this.getTopStudents();
    const topTeachers = await this.getTopTeachers();

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

  private async getUsersByRole(): Promise<RoleDistribution[]> {
    const total = await this.userRepo.count();
    
    const result = await this.userRepo
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    return result.map(r => ({
      role: r.role,
      count: parseInt(r.count),
      percentage: total > 0 ? Math.round((parseInt(r.count) / total) * 100 * 10) / 10 : 0,
    }));
  }

  private async getUserGrowthReport(): Promise<UserGrowth[]> {
    const result = await this.userRepo
      .createQueryBuilder('user')
      .select("TO_CHAR(user.createdAt, 'YYYY-MM')", 'period')
      .addSelect('COUNT(*)', 'newUsers')
      .groupBy('period')
      .orderBy('period', 'DESC')
      .limit(12)
      .getRawMany();

    // For activeUsers, we would need a lastLoginAt field tracked properly
    // For now, returning newUsers data
    return result.reverse().map(r => ({
      period: r.period,
      newUsers: parseInt(r.newUsers),
      activeUsers: parseInt(r.newUsers), // Placeholder
    }));
  }

  private async getTopStudents(): Promise<TopStudent[]> {
    const result = await this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .leftJoin('enrollment.student', 'student')
      .leftJoin('enrollment.payments', 'payment')
      .select('student.id', 'studentId')
      .addSelect('student.name', 'studentName')
      .addSelect('student.email', 'studentEmail')
      .addSelect('COUNT(DISTINCT enrollment.id)', 'coursesEnrolled')
      .addSelect('COALESCE(SUM(payment.finalAmount), 0)', 'totalSpent')
      .addSelect(
        'ROUND(AVG(CASE WHEN enrollment.completedAt IS NOT NULL THEN 100 ELSE 0 END))',
        'completionRate'
      )
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('student.id')
      .addGroupBy('student.name')
      .addGroupBy('student.email')
      .orderBy('totalSpent', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map(r => ({
      studentId: r.studentId,
      studentName: r.studentName,
      studentEmail: r.studentEmail,
      coursesEnrolled: parseInt(r.coursesEnrolled),
      totalSpent: parseFloat(r.totalSpent) || 0,
      completionRate: parseFloat(r.completionRate) || 0,
    }));
  }

  private async getTopTeachers(): Promise<TopTeacher[]> {
    const result = await this.courseRepo
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
      .groupBy('teacher.id')
      .addGroupBy('teacher.name')
      .addGroupBy('teacher.email')
      .orderBy('totalRevenue', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map(r => ({
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
  async getPerformanceReport(): Promise<PerformanceReport> {
    const topPerformingCourses = await this.getCoursePerformance('DESC', 10);
    const lowPerformingCourses = await this.getCoursePerformance('ASC', 10);
    const completionRates = await this.getCompletionRates();
    const engagementMetrics = await this.getEngagementMetrics();

    return {
      topPerformingCourses,
      lowPerformingCourses,
      completionRates,
      engagementMetrics,
    };
  }

  private async getCoursePerformance(order: 'ASC' | 'DESC', limit: number): Promise<CoursePerformance[]> {
    const result = await this.courseRepo
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
        'completionRate'
      )
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('course.id')
      .addGroupBy('course.title')
      .addGroupBy('teacher.name')
      .orderBy('revenue', order)
      .limit(limit)
      .getRawMany();

    return result.map(r => ({
      courseId: r.courseId,
      courseTitle: r.courseTitle,
      teacherName: r.teacherName,
      enrollments: parseInt(r.enrollments) || 0,
      revenue: parseFloat(r.revenue) || 0,
      averageRating: Math.round(parseFloat(r.averageRating) * 10) / 10,
      completionRate: parseFloat(r.completionRate) || 0,
    }));
  }

  private async getCompletionRates(): Promise<CompletionRate[]> {
    const result = await this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .leftJoin('enrollment.course', 'course')
      .leftJoin('course.category', 'category')
      .select('category.name', 'categoryName')
      .addSelect('COUNT(*)', 'totalEnrollments')
      .addSelect('COUNT(CASE WHEN enrollment.completedAt IS NOT NULL THEN 1 END)', 'completedEnrollments')
      .groupBy('category.name')
      .getRawMany();

    return result.map(r => {
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
