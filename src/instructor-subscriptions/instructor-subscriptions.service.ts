import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Course } from '../courses/entities/course.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UpsertPlanDto } from './dto/upsert-plan.dto';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import { InstructorPlan } from './entities/instructor-plan.entity';
import {
  InstructorSubscription,
  InstructorSubscriptionStatus,
} from './entities/instructor-subscription.entity';
import {
  InstructorSubscriptionPayment,
  InstructorSubscriptionPaymentStatus,
} from './entities/instructor-subscription-payment.entity';

@Injectable()
export class InstructorSubscriptionsService implements OnModuleInit {
  constructor(
    @InjectRepository(InstructorPlan)
    private readonly planRepo: Repository<InstructorPlan>,
    @InjectRepository(InstructorSubscription)
    private readonly subscriptionRepo: Repository<InstructorSubscription>,
    @InjectRepository(InstructorSubscriptionPayment)
    private readonly paymentRepo: Repository<InstructorSubscriptionPayment>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultPlans();
  }

  private async ensureDefaultPlans() {
    const count = await this.planRepo.count();
    if (count > 0) return;

    const defaults: Array<Partial<InstructorPlan>> = [
      {
        name: 'Free',
        price: 0,
        durationMonths: 1,
        courseLimit: 2,
        storageLimitGb: 2,
        studentsLimit: 200,
        features: ['2 khoa hoc', 'Thong ke co ban'],
        isActive: true,
      },
      {
        name: 'Basic',
        price: 9,
        durationMonths: 1,
        courseLimit: 20,
        storageLimitGb: 10,
        studentsLimit: 120,
        features: ['20 khoa hoc', '10GB storage', 'Bao cao nang cao'],
        isActive: true,
      },
      {
        name: 'Pro',
        price: 19,
        durationMonths: 1,
        courseLimit: 50,
        storageLimitGb: 50,
        studentsLimit: null,
        features: ['50 khoa hoc', '50GB storage', 'Hoc vien khong gioi han'],
        isActive: true,
      },
      {
        name: 'Enterprise',
        price: 49,
        durationMonths: 1,
        courseLimit: 500,
        storageLimitGb: 500,
        studentsLimit: null,
        features: ['Quy mo lon', 'Ho tro uu tien'],
        isActive: true,
      },
    ];

    await this.planRepo.save(defaults.map((item) => this.planRepo.create(item)));
  }

  async getPublicPlans() {
    return this.planRepo.find({ where: { isActive: true }, order: { price: 'ASC' } });
  }

  async getAdminPlans() {
    return this.planRepo.find({ order: { price: 'ASC' } });
  }

  async createPlan(dto: UpsertPlanDto) {
    const existing = await this.planRepo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new BadRequestException('Ten goi da ton tai');
    }

    const plan = this.planRepo.create({
      ...dto,
      storageLimitGb: dto.storageLimitGb ?? null,
      studentsLimit: dto.studentsLimit ?? null,
      features: dto.features || [],
      isActive: dto.isActive ?? true,
    });

    return this.planRepo.save(plan);
  }

  async updatePlan(id: string, dto: Partial<UpsertPlanDto>) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Khong tim thay goi');
    }

    Object.assign(plan, {
      ...dto,
      storageLimitGb: dto.storageLimitGb ?? plan.storageLimitGb,
      studentsLimit: dto.studentsLimit ?? plan.studentsLimit,
      features: dto.features ?? plan.features,
    });

    return this.planRepo.save(plan);
  }

  async removePlan(id: string) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Khong tim thay goi');

    const usedCount = await this.subscriptionRepo.count({ where: { planId: id } });
    if (usedCount > 0) {
      plan.isActive = false;
      await this.planRepo.save(plan);
      return { message: 'Goi da duoc khoa vi dang co nguoi su dung' };
    }

    await this.planRepo.delete(id);
    return { message: 'Da xoa goi' };
  }

  private addMonths(date: Date, months: number) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
  }

  private async getOrCreateFreePlan() {
    let freePlan = await this.planRepo.findOne({ where: { name: 'Free' } });
    if (!freePlan) {
      freePlan = await this.planRepo.save(
        this.planRepo.create({
          name: 'Free',
          price: 0,
          durationMonths: 1,
          courseLimit: 2,
          storageLimitGb: 2,
          studentsLimit: 200,
          features: ['2 khoa hoc'],
          isActive: true,
        }),
      );
    }
    return freePlan;
  }

  async getTeacherSubscription(teacherId: string) {
    const teacher = await this.userRepo.findOne({ where: { id: teacherId } });
    if (!teacher || teacher.role !== UserRole.TEACHER) {
      throw new ForbiddenException('Chi giang vien moi co the xem goi');
    }

    let subscription = await this.subscriptionRepo.findOne({
      where: { teacherId, status: InstructorSubscriptionStatus.ACTIVE },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });

    if (!subscription) {
      const freePlan = await this.getOrCreateFreePlan();
      const now = new Date();
      subscription = await this.subscriptionRepo.save(
        this.subscriptionRepo.create({
          teacherId,
          planId: freePlan.id,
          status: InstructorSubscriptionStatus.ACTIVE,
          startDate: now,
          endDate: this.addMonths(now, freePlan.durationMonths || 1),
          autoRenew: false,
        }),
      );
      subscription.plan = freePlan;
    }

    const coursesCreated = await this.courseRepo.count({ where: { teacherId } });
    const courseLimit = subscription.plan?.courseLimit || 2;
    const remainingCourses = Math.max(0, courseLimit - coursesCreated);

    const billingHistory = await this.paymentRepo.find({
      where: { teacherId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return {
      subscription,
      usage: {
        coursesCreated,
        courseLimit,
        remainingCourses,
      },
      billingHistory,
    };
  }

  async enforceTeacherCourseLimit(teacherId: string) {
    const { usage, subscription } = await this.getTeacherSubscription(teacherId);
    if (usage.coursesCreated >= usage.courseLimit) {
      throw new ForbiddenException(
        `Ban da dat gioi han ${usage.courseLimit} khoa hoc cua goi ${subscription.plan?.name || 'Free'}. Vui long nang cap de tao them khoa hoc.`,
      );
    }
  }

  private generateTx() {
    return `SUB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  async upgradePlan(teacherId: string, dto: UpgradeSubscriptionDto) {
    const plan = await this.planRepo.findOne({ where: { id: dto.planId, isActive: true } });
    if (!plan) throw new NotFoundException('Goi nang cap khong ton tai');

    const now = new Date();
    const endDate = this.addMonths(now, plan.durationMonths || 1);

    let subscription = await this.subscriptionRepo.findOne({
      where: { teacherId, status: InstructorSubscriptionStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    if (subscription) {
      subscription.planId = plan.id;
      subscription.startDate = now;
      subscription.endDate = endDate;
      subscription.status = InstructorSubscriptionStatus.ACTIVE;
      subscription.cancelReason = null;
      subscription.paymentMethod = dto.paymentMethod || subscription.paymentMethod;
      subscription = await this.subscriptionRepo.save(subscription);
    } else {
      subscription = await this.subscriptionRepo.save(
        this.subscriptionRepo.create({
          teacherId,
          planId: plan.id,
          startDate: now,
          endDate,
          status: InstructorSubscriptionStatus.ACTIVE,
          autoRenew: false,
          paymentMethod: dto.paymentMethod || null,
        }),
      );
    }

    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        transactionId: this.generateTx(),
        teacherId,
        planId: plan.id,
        subscriptionId: subscription.id,
        amount: Number(plan.price || 0),
        currency: 'USD',
        paymentMethod: dto.paymentMethod || 'manual',
        status: InstructorSubscriptionPaymentStatus.PAID,
        paidAt: new Date(),
        metadata: dto.metadata || null,
      }),
    );

    return { subscription, payment, plan };
  }

  async cancelSubscription(teacherId: string, reason?: string) {
    const subscription = await this.subscriptionRepo.findOne({
      where: { teacherId, status: InstructorSubscriptionStatus.ACTIVE },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });

    if (!subscription) {
      throw new NotFoundException('Khong tim thay goi dang su dung');
    }

    const freePlan = await this.getOrCreateFreePlan();

    subscription.planId = freePlan.id;
    subscription.status = InstructorSubscriptionStatus.ACTIVE;
    subscription.startDate = new Date();
    subscription.endDate = this.addMonths(new Date(), freePlan.durationMonths || 1);
    subscription.cancelReason = reason || 'User cancelled';

    await this.subscriptionRepo.save(subscription);

    return this.getTeacherSubscription(teacherId);
  }

  async getAdminSubscriptions() {
    const subs = await this.subscriptionRepo.find({
      relations: ['teacher', 'plan'],
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      subs.map(async (sub) => {
        const coursesCreated = await this.courseRepo.count({ where: { teacherId: sub.teacherId } });
        return {
          ...sub,
          teacher: sub.teacher,
          plan: sub.plan,
          usage: {
            coursesCreated,
            courseLimit: sub.plan?.courseLimit ?? 2,
          },
        };
      }),
    );
  }

  async getAdminPayments() {
    return this.paymentRepo.find({
      relations: ['teacher', 'plan'],
      order: { createdAt: 'DESC' },
    });
  }

  async confirmPayment(id: string) {
    const payment = await this.paymentRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException('Khong tim thay giao dich');
    payment.status = InstructorSubscriptionPaymentStatus.PAID;
    payment.paidAt = new Date();
    return this.paymentRepo.save(payment);
  }

  async refundPayment(id: string) {
    const payment = await this.paymentRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException('Khong tim thay giao dich');
    payment.status = InstructorSubscriptionPaymentStatus.REFUNDED;
    return this.paymentRepo.save(payment);
  }

  async getRevenueDashboard() {
    const payments = await this.paymentRepo.find({ where: { status: InstructorSubscriptionPaymentStatus.PAID } });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const monthlyRevenue = payments
      .filter((p) => p.createdAt >= monthStart)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const [activeUsers, paidUsers] = await Promise.all([
      this.userRepo.count({ where: { role: UserRole.TEACHER } }),
      this.subscriptionRepo
        .createQueryBuilder('s')
        .leftJoin('s.plan', 'plan')
        .where('s.status = :status', { status: InstructorSubscriptionStatus.ACTIVE })
        .andWhere('plan.price > 0')
        .getCount(),
    ]);

    const conversionRate = activeUsers > 0 ? (paidUsers / activeUsers) * 100 : 0;

    const monthlyPoints = [] as Array<{ month: string; revenue: number; upgradedUsers: number }>;
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthPayments = payments.filter((p) => p.createdAt >= start && p.createdAt < end);
      const upgradedUsers = new Set(monthPayments.map((p) => p.teacherId)).size;
      monthlyPoints.push({
        month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        revenue: monthPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
        upgradedUsers,
      });
    }

    return {
      totalRevenue,
      monthlyRevenue,
      activeUsers,
      paidUsers,
      conversionRate: Math.round(conversionRate * 10) / 10,
      monthlyPoints,
    };
  }
}
