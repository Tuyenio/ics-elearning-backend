import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../courses/entities/course.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity';
import { UpsertPlanDto } from './dto/upsert-plan.dto';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import {
  InstructorPaymentMethod,
  InstructorPaymentMethodType,
} from './entities/instructor-payment-method.entity';
import { InstructorPlan } from './entities/instructor-plan.entity';
import {
  InstructorSubscription,
  InstructorSubscriptionStatus,
} from './entities/instructor-subscription.entity';
import { AdminAuditLog } from '../admin/entities/admin-audit-log.entity';
import {
  InstructorSubscriptionPayment,
  InstructorSubscriptionPaymentStatus,
} from './entities/instructor-subscription-payment.entity';
import { WalletService } from '../wallet/wallet.service';
import { SepayWebhookDto } from '../payments/dto/sepay-webhook.dto';

@Injectable()
export class InstructorSubscriptionsService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(InstructorSubscriptionsService.name);
  private static readonly PAYMENT_EXPIRE_MS = 15 * 60 * 1000;
  private autoRenewTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(InstructorPlan)
    private readonly planRepo: Repository<InstructorPlan>,
    @InjectRepository(InstructorSubscription)
    private readonly subscriptionRepo: Repository<InstructorSubscription>,
    @InjectRepository(InstructorSubscriptionPayment)
    private readonly paymentRepo: Repository<InstructorSubscriptionPayment>,
    @InjectRepository(InstructorPaymentMethod)
    private readonly paymentMethodRepo: Repository<InstructorPaymentMethod>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AdminAuditLog)
    private readonly auditLogRepo: Repository<AdminAuditLog>,
    private readonly walletService: WalletService,
  ) {}

  private toText(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '';
  }

  private toNullableText(value: unknown): string | null {
    const text = this.toText(value).trim();
    return text.length > 0 ? text : null;
  }

  private toBool(value: unknown): boolean {
    return value === true;
  }

  async onModuleInit() {
    await this.ensureDefaultPlans();
    this.autoRenewTimer = setInterval(() => {
      void this.processDueAutoRenewSubscriptions();
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.autoRenewTimer) {
      clearInterval(this.autoRenewTimer);
      this.autoRenewTimer = null;
    }
  }

  private async processDueAutoRenewSubscriptions(): Promise<void> {
    const dueSubscriptions = await this.subscriptionRepo.find({
      where: {
        status: InstructorSubscriptionStatus.ACTIVE,
        autoRenew: true,
      },
      relations: ['plan'],
      order: { endDate: 'ASC' },
    });

    for (const subscription of dueSubscriptions) {
      if (!this.isSubscriptionExpired(subscription)) {
        continue;
      }

      try {
        await this.reconcileActiveSubscription(subscription.teacherId, subscription);
      } catch (error) {
        this.logger.warn(
          `[AUTO_RENEW] teacher=${subscription.teacherId} subscription=${subscription.id} failed: ${
            error instanceof Error ? error.message : 'unknown_error'
          }`,
        );
      }
    }
  }

  private async ensureDefaultPlans() {
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
        name: 'Pro',
        price: 9000,
        durationMonths: 1,
        courseLimit: 20,
        storageLimitGb: 10,
        studentsLimit: 120,
        features: ['20 khoa hoc', '10GB storage', 'Bao cao nang cao'],
        isActive: true,
      },
      {
        name: 'Pro Plus',
        price: 19000,
        durationMonths: 1,
        courseLimit: 50,
        storageLimitGb: 50,
        studentsLimit: null,
        features: ['50 khoa hoc', '50GB storage', 'Hoc vien khong gioi han'],
        isActive: true,
      },
      {
        name: 'Enterprise',
        price: 49000,
        durationMonths: 1,
        courseLimit: 500,
        storageLimitGb: 500,
        studentsLimit: null,
        features: ['Quy mo lon', 'Ho tro uu tien'],
        isActive: true,
      },
      {
        name: 'Pro premium',
        price: 99000,
        durationMonths: 1,
        courseLimit: 20,
        storageLimitGb: 10,
        studentsLimit: 120,
        features: ['20 khoa hoc', '10GB storage', 'Uu tien ho tro'],
        isActive: true,
      },
    ];

    for (const defaultPlan of defaults) {
      const existing = await this.planRepo
        .createQueryBuilder('plan')
        .where('LOWER(plan.name) = LOWER(:name)', { name: defaultPlan.name })
        .getOne();

      if (existing) {
        const { name: _name, ...updateFields } = defaultPlan;
        await this.planRepo.update(existing.id, updateFields);
        continue;
      }

      await this.planRepo.save(this.planRepo.create(defaultPlan));
    }

    await this.planRepo
      .createQueryBuilder()
      .update(InstructorPlan)
      .set({ isActive: false })
      .where('LOWER(name) IN (:...legacyNames)', { legacyNames: ['basic'] })
      .execute();
  }

  async getPublicPlans() {
    return this.planRepo.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
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

  async removePlan(id: string, actor?: User) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Khong tim thay goi');

    if (String(plan.name || '').trim().toLowerCase() === 'free') {
      throw new BadRequestException('Goi Free la goi mac dinh, khong the xoa');
    }

    const actorInfo = actor
      ? `${actor.email} (${actor.id})`
      : 'unknown-actor';
    const nowIso = new Date().toISOString();

    const usedCount = await this.subscriptionRepo.count({
      where: { planId: id },
    });
    const paymentCount = await this.paymentRepo.count({
      where: { planId: id },
    });
    if (usedCount > 0 || paymentCount > 0) {
      plan.isActive = false;
      await this.planRepo.save(plan);
      await this.auditLogRepo.save(
        this.auditLogRepo.create({
          action: 'instructor_plan.deactivate',
          entityType: 'instructor_plan',
          entityId: plan.id,
          actorId: actor?.id ?? null,
          actorEmail: actor?.email ?? null,
          metadata: {
            name: plan.name,
            usedCount,
            paymentCount,
            price: plan.price,
            durationMonths: plan.durationMonths,
          },
        }),
      );
      this.logger.warn(
        `[PLAN_DELETE] ${nowIso} admin=${actorInfo} action=deactivate plan=${plan.id} name=${plan.name} usedCount=${usedCount} paymentCount=${paymentCount}`,
      );
      return { message: 'Goi da duoc khoa vi con du lieu lien quan' };
    }

    await this.planRepo.delete(id);
    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        action: 'instructor_plan.delete',
        entityType: 'instructor_plan',
        entityId: plan.id,
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? null,
        metadata: {
          name: plan.name,
          price: plan.price,
          durationMonths: plan.durationMonths,
        },
      }),
    );
    this.logger.log(
      `[PLAN_DELETE] ${nowIso} admin=${actorInfo} action=delete plan=${plan.id} name=${plan.name}`,
    );
    return { message: 'Da xoa goi' };
  }

  private addMonths(date: Date, months: number) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
  }

  private isSubscriptionExpired(subscription: InstructorSubscription): boolean {
    if (!subscription?.endDate) return false;
    const endDate = new Date(subscription.endDate);
    if (Number.isNaN(endDate.getTime())) return false;
    return endDate.getTime() <= Date.now();
  }

  private async processAutoRenewWithWallet(
    teacherId: string,
    subscription: InstructorSubscription,
  ): Promise<InstructorSubscription> {
    const plan = subscription.plan;
    const amount = this.normalizeAmount(Number(plan?.price || 0));

    if (!plan || amount <= 0) {
      return subscription;
    }

    const tx = this.generateTx();
    const now = new Date();

    await this.walletService.debitBalance(
      teacherId,
      amount,
      'instructor_subscription_auto_renew',
      {
        description: `Tu dong gia han goi giang vien ${plan.name}`,
        metadata: {
          subscriptionId: subscription.id,
          planId: plan.id,
          autoRenew: true,
          source: 'subscription_expiration',
        },
      },
    );

    await this.paymentRepo.save(
      this.paymentRepo.create({
        transactionId: tx,
        teacherId,
        planId: plan.id,
        amount,
        currency: 'VND',
        status: InstructorSubscriptionPaymentStatus.PAID,
        paymentMethod: 'wallet',
        paidAt: now,
        metadata: {
          autoRenew: true,
          subscriptionId: subscription.id,
          reason: 'auto_renew_on_expiration',
        },
      }),
    );

    subscription.status = InstructorSubscriptionStatus.ACTIVE;
    subscription.startDate = now;
    subscription.endDate = this.addMonths(now, plan.durationMonths || 1);
    subscription.paymentMethod = 'wallet';
    subscription.cancelReason = null;
    return this.subscriptionRepo.save(subscription);
  }

  private async reconcileActiveSubscription(
    teacherId: string,
    subscription: InstructorSubscription,
  ): Promise<InstructorSubscription> {
    if (!this.isSubscriptionExpired(subscription)) {
      return subscription;
    }

    const canAutoRenew =
      subscription.autoRenew === true &&
      Number(subscription.plan?.price || 0) > 0;

    if (canAutoRenew) {
      try {
        return await this.processAutoRenewWithWallet(teacherId, subscription);
      } catch {
        subscription.status = InstructorSubscriptionStatus.EXPIRED;
        subscription.cancelReason =
          'auto_renew_failed_insufficient_wallet_or_error';
        await this.subscriptionRepo.save(subscription);
        return subscription;
      }
    }

    subscription.status = InstructorSubscriptionStatus.EXPIRED;
    subscription.cancelReason = subscription.cancelReason || 'subscription_expired';
    await this.subscriptionRepo.save(subscription);
    return subscription;
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

    if (subscription) {
      subscription = await this.reconcileActiveSubscription(teacherId, subscription);
      if (subscription.status !== InstructorSubscriptionStatus.ACTIVE) {
        subscription = await this.subscriptionRepo.findOne({
          where: { teacherId, status: InstructorSubscriptionStatus.ACTIVE },
          relations: ['plan'],
          order: { createdAt: 'DESC' },
        });
      }
    }

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

    const coursesCreated = await this.courseRepo.count({
      where: { teacherId },
    });
    const courseLimit = subscription.plan?.courseLimit || 2;
    const remainingCourses = Math.max(0, courseLimit - coursesCreated);
    const studentsUsedRaw = await this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .innerJoin('enrollment.course', 'course')
      .where('course.teacherId = :teacherId', { teacherId })
      .andWhere('enrollment.status IN (:...statuses)', {
        statuses: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
      })
      .select('COUNT(DISTINCT enrollment.studentId)', 'count')
      .getRawOne<{ count: string | null }>();

    const studentsUsed = Number.parseInt(studentsUsedRaw?.count || '0', 10) || 0;
    const studentsLimit =
      subscription.plan?.studentsLimit === null ||
      subscription.plan?.studentsLimit === undefined
        ? null
        : Number(subscription.plan.studentsLimit || 0);
    const remainingStudents =
      studentsLimit === null
        ? null
        : Math.max(0, studentsLimit - studentsUsed);

    const storageLimitGb =
      subscription.plan?.storageLimitGb === null ||
      subscription.plan?.storageLimitGb === undefined
        ? null
        : Number(subscription.plan.storageLimitGb || 0);

    // The system currently does not persist per-teacher media bytes,
    // so we expose a bounded estimate based on course usage ratio.
    const storageUsedGbEstimate =
      storageLimitGb === null || storageLimitGb <= 0
        ? null
        : Number(
            (
              Math.min(1, courseLimit > 0 ? coursesCreated / courseLimit : 0) *
              storageLimitGb
            ).toFixed(2),
          );
    const remainingStorageGbEstimate =
      storageLimitGb === null || storageUsedGbEstimate === null
        ? null
        : Number(Math.max(0, storageLimitGb - storageUsedGbEstimate).toFixed(2));

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
        studentsUsed,
        studentsLimit,
        remainingStudents,
        storageLimitGb,
        storageUsedGbEstimate,
        remainingStorageGbEstimate,
        storageUsageSource: 'estimate_by_course_usage_ratio',
      },
      billingHistory,
    };
  }

  async updateTeacherAutoRenew(teacherId: string, enabled: boolean) {
    const payload = await this.getTeacherSubscription(teacherId);
    const subscription = payload.subscription as InstructorSubscription;

    subscription.autoRenew = enabled;
    const saved = await this.subscriptionRepo.save(subscription);

    return {
      success: true,
      subscription: saved,
    };
  }

  async enforceTeacherCourseLimit(teacherId: string) {
    const { usage, subscription } =
      await this.getTeacherSubscription(teacherId);
    if (usage.coursesCreated >= usage.courseLimit) {
      throw new ForbiddenException(
        `Ban da dat gioi han ${usage.courseLimit} khoa hoc cua goi ${subscription.plan?.name || 'Free'}. Vui long nang cap de tao them khoa hoc.`,
      );
    }
  }

  private generateTx() {
    return `SUB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  private normalizeAmount(value: number): number {
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) {
      throw new BadRequestException('So tien khong hop le');
    }
    return Number(normalized.toFixed(2));
  }

  private normalizePaymentChannel(channel?: string | null): 'wallet' | 'sepay_qr' {
    const normalized = String(channel || '').toLowerCase().trim();
    if (normalized === 'wallet') {
      return 'wallet';
    }

    return 'sepay_qr';
  }

  private isPendingPaymentExpired(
    payment: Pick<InstructorSubscriptionPayment, 'expiresAt'>,
  ): boolean {
    if (!payment.expiresAt) {
      return false;
    }

    return payment.expiresAt.getTime() <= Date.now();
  }

  private async syncExpiredInstructorPayments(): Promise<void> {
    await this.paymentRepo
      .createQueryBuilder()
      .update(InstructorSubscriptionPayment)
      .set({ status: InstructorSubscriptionPaymentStatus.EXPIRED })
      .where('status = :pendingStatus', {
        pendingStatus: InstructorSubscriptionPaymentStatus.PENDING,
      })
      .andWhere('expiresAt IS NOT NULL')
      .andWhere('expiresAt <= :now', { now: new Date() })
      .execute();
  }

  private async reconcilePendingQrByTeacher(teacherId?: string): Promise<void> {
    const query = this.paymentRepo
      .createQueryBuilder('payment')
      .where('payment.status = :pendingStatus', {
        pendingStatus: InstructorSubscriptionPaymentStatus.PENDING,
      })
      .andWhere('payment.paymentMethod = :paymentMethod', {
        paymentMethod: 'sepay_qr',
      })
      .orderBy('payment.teacherId', 'ASC')
      .addOrderBy('payment.createdAt', 'DESC');

    if (teacherId) {
      query.andWhere('payment.teacherId = :teacherId', { teacherId });
    }

    const pendingQrPayments = await query.getMany();
    if (pendingQrPayments.length <= 1) {
      return;
    }

    const latestByTeacher = new Map<string, InstructorSubscriptionPayment>();
    const replacedAt = new Date().toISOString();
    const toFail: InstructorSubscriptionPayment[] = [];

    for (const payment of pendingQrPayments) {
      const latest = latestByTeacher.get(payment.teacherId);
      if (!latest) {
        latestByTeacher.set(payment.teacherId, payment);
        continue;
      }

      payment.status = InstructorSubscriptionPaymentStatus.FAILED;
      payment.metadata = {
        ...(payment.metadata || {}),
        failureReason: 'replaced_by_new_checkout',
        replacedByTransactionId: latest.transactionId,
        replacedAt,
      };
      toFail.push(payment);
    }

    if (toFail.length > 0) {
      await this.paymentRepo.save(toFail);
    }
  }

  private async markPreviousPendingQrAsFailed(
    teacherId: string,
    replacementTransactionId: string,
  ): Promise<void> {
    const pendingPayments = await this.paymentRepo.find({
      where: {
        teacherId,
        status: InstructorSubscriptionPaymentStatus.PENDING,
        paymentMethod: 'sepay_qr',
      },
      order: { createdAt: 'DESC' },
    });

    const oldPendingPayments = pendingPayments.filter(
      (payment) => payment.transactionId !== replacementTransactionId,
    );

    if (oldPendingPayments.length === 0) {
      return;
    }

    const replacedAt = new Date().toISOString();

    for (const oldPayment of oldPendingPayments) {
      oldPayment.status = InstructorSubscriptionPaymentStatus.FAILED;
      oldPayment.metadata = {
        ...(oldPayment.metadata || {}),
        failureReason: 'replaced_by_new_checkout',
        replacedByTransactionId: replacementTransactionId,
        replacedAt,
      };
    }

    await this.paymentRepo.save(oldPendingPayments);
  }

  private resolveTransferCode(content?: string): string | null {
    if (!content) {
      return null;
    }

    const normalized = content.toUpperCase();
    const match = normalized.match(/SUB-[A-Z0-9-]+/);
    return match?.[0] || null;
  }

  private getSepayBankName(): string {
    return process.env.SEPAY_BANK_NAME || process.env.BANK_NAME || 'BIDV';
  }

  private getSepayAccountNumber(): string {
    return (
      process.env.SEPAY_BANK_ACCOUNT_NUMBER ||
      process.env.BANK_ACCOUNT_NUMBER ||
      '8820162447'
    );
  }

  private buildSepayQrUrl(amount: number, transactionCode: string): string {
    const params = new URLSearchParams({
      acc: this.getSepayAccountNumber(),
      bank: this.getSepayBankName(),
      amount: Math.round(amount).toString(),
      des: transactionCode,
    });

    return `https://qr.sepay.vn/img?${params.toString()}`;
  }

  private toPlanCode(plan: InstructorPlan) {
    const normalized = String(plan.name || 'PLAN')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized || 'PLAN';
  }

  private async applyPlanToTeacher(
    teacherId: string,
    plan: InstructorPlan,
    paymentMethod?: string | null,
  ) {
    const now = new Date();
    const endDate = this.addMonths(now, plan.durationMonths || 1);

    const activeSubscriptions = await this.subscriptionRepo.find({
      where: { teacherId, status: InstructorSubscriptionStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    const subscription = activeSubscriptions[0];

    if (activeSubscriptions.length > 1) {
      for (const extra of activeSubscriptions.slice(1)) {
        extra.status = InstructorSubscriptionStatus.CANCELLED;
        extra.cancelReason =
          extra.cancelReason || 'Replaced by newer active subscription';
      }
      await this.subscriptionRepo.save(activeSubscriptions.slice(1));
    }

    if (subscription) {
      subscription.planId = plan.id;
      subscription.startDate = now;
      subscription.endDate = endDate;
      subscription.status = InstructorSubscriptionStatus.ACTIVE;
      subscription.autoRenew = false;
      subscription.cancelReason = null;
      subscription.paymentMethod = paymentMethod || subscription.paymentMethod;
      return this.subscriptionRepo.save(subscription);
    }

    return this.subscriptionRepo.save(
      this.subscriptionRepo.create({
        teacherId,
        planId: plan.id,
        startDate: now,
        endDate,
        status: InstructorSubscriptionStatus.ACTIVE,
        autoRenew: false,
        paymentMethod: paymentMethod || null,
      }),
    );
  }

  async getTeacherPaymentMethods(teacherId: string) {
    return this.paymentMethodRepo.find({
      where: { teacherId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async createTeacherPaymentMethod(
    teacherId: string,
    dto: Record<string, unknown>,
  ) {
    const type = dto.type as InstructorPaymentMethodType;
    if (!Object.values(InstructorPaymentMethodType).includes(type)) {
      throw new BadRequestException('Loai phuong thuc thanh toan khong hop le');
    }

    const hasAnyMethod =
      (await this.paymentMethodRepo.count({ where: { teacherId } })) > 0;

    if (type === InstructorPaymentMethodType.BANK_CARD) {
      const cardNumberRaw = this.toText(dto.cardNumber).replace(/\s+/g, '');
      const cvv = this.toText(dto.cvv).trim();
      const cardHolderName = this.toText(dto.cardHolderName).trim();
      const cardExpiry = this.toText(dto.cardExpiry).trim();

      if (cardNumberRaw.length < 12 || cvv.length < 3) {
        throw new BadRequestException('Thong tin the khong hop le');
      }

      if (!cardHolderName) {
        throw new BadRequestException('Vui long nhap ten chu the');
      }

      const cardLast4 = cardNumberRaw.slice(-4);
      const label = this.toText(dto.label) || `The ****${cardLast4}`;

      if (!hasAnyMethod || this.toBool(dto.isDefault)) {
        await this.paymentMethodRepo.update(
          { teacherId },
          { isDefault: false },
        );
      }

      return this.paymentMethodRepo.save(
        this.paymentMethodRepo.create({
          teacherId,
          type,
          provider: 'bank_card',
          label,
          cardLast4,
          cardHolderName,
          cardExpiry,
          walletPhone: null,
          isDefault: !hasAnyMethod || this.toBool(dto.isDefault),
          metadata: {
            brand: this.toNullableText(dto.brand),
            masked: `**** **** **** ${cardLast4}`,
          },
        }),
      );
    }

    const provider = this.toText(dto.provider).toLowerCase();
    if (!provider || !['momo', 'zalopay'].includes(provider)) {
      throw new BadRequestException('Vi dien tu chi ho tro momo hoac zalopay');
    }

    if (!hasAnyMethod || this.toBool(dto.isDefault)) {
      await this.paymentMethodRepo.update({ teacherId }, { isDefault: false });
    }

    const walletPhone = this.toNullableText(dto.walletPhone);
    const label =
      this.toText(dto.label) ||
      `${provider.toUpperCase()}${walletPhone ? ` - ${walletPhone}` : ''}`;

    return this.paymentMethodRepo.save(
      this.paymentMethodRepo.create({
        teacherId,
        type,
        provider,
        label,
        cardLast4: null,
        cardHolderName: null,
        cardExpiry: null,
        walletPhone,
        isDefault: !hasAnyMethod || this.toBool(dto.isDefault),
        metadata: {
          deeplink: provider === 'momo' ? 'momo://app' : 'zalopay://app',
          returnUrl: this.toNullableText(dto.returnUrl),
        },
      }),
    );
  }

  async setDefaultTeacherPaymentMethod(teacherId: string, id: string) {
    const method = await this.paymentMethodRepo.findOne({
      where: { id, teacherId },
    });
    if (!method) {
      throw new NotFoundException('Khong tim thay phuong thuc thanh toan');
    }

    await this.paymentMethodRepo.update({ teacherId }, { isDefault: false });
    method.isDefault = true;
    return this.paymentMethodRepo.save(method);
  }

  async createCheckout(teacherId: string, dto: UpgradeSubscriptionDto) {
    const plan = await this.planRepo.findOne({
      where: { id: dto.planId, isActive: true },
    });
    if (!plan) {
      throw new NotFoundException('Goi nang cap khong ton tai');
    }

    let paymentMethod: InstructorPaymentMethod | null = null;
    if (dto.paymentMethodId) {
      paymentMethod = await this.paymentMethodRepo.findOne({
        where: { id: dto.paymentMethodId, teacherId },
      });
      if (!paymentMethod) {
        throw new NotFoundException(
          'Khong tim thay phuong thuc thanh toan da luu',
        );
      }
    }

    const paymentChannel = this.normalizePaymentChannel(dto.paymentChannel);
    const tx = this.generateTx();
    const planCode = this.toPlanCode(plan);
    const amount = this.normalizeAmount(Number(plan.price || 0));

    if (paymentChannel === 'sepay_qr') {
      await this.syncExpiredInstructorPayments();
      await this.reconcilePendingQrByTeacher(teacherId);
      await this.markPreviousPendingQrAsFailed(teacherId, tx);
    }

    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        transactionId: tx,
        teacherId,
        planId: plan.id,
        subscriptionId: null,
        amount,
        currency: 'VND',
        paymentMethod: paymentChannel,
        status: InstructorSubscriptionPaymentStatus.PENDING,
        paidAt: null,
        expiresAt:
          paymentChannel === 'sepay_qr'
            ? new Date(Date.now() + InstructorSubscriptionsService.PAYMENT_EXPIRE_MS)
            : null,
        metadata: {
          ...(dto.metadata || {}),
          paymentChannel,
          planCode,
          paymentMethodId: paymentMethod?.id || null,
          provider: paymentMethod?.provider || null,
        },
      }),
    );

    if (paymentChannel === 'sepay_qr') {
      await this.markPreviousPendingQrAsFailed(teacherId, payment.transactionId);
    }

    if (paymentChannel === 'wallet') {
      try {
        if (amount > 0) {
          await this.walletService.debitBalance(
            teacherId,
            amount,
            'teacher_subscription_payment',
            {
              instructorSubscriptionPaymentId: payment.id,
              description: `Thanh toán gói giảng viên ${plan.name}`,
              metadata: {
                planId: plan.id,
              },
            },
          );
        }

        const subscription = await this.applyPlanToTeacher(
          teacherId,
          plan,
          paymentChannel,
        );

        payment.status = InstructorSubscriptionPaymentStatus.PAID;
        payment.paidAt = new Date();
        payment.subscriptionId = subscription.id;
        const savedPayment = await this.paymentRepo.save(payment);

        return {
          transactionId: savedPayment.transactionId,
          status: savedPayment.status,
          amount: savedPayment.amount,
          currency: savedPayment.currency,
          plan,
          paymentChannel,
          subscription,
          message: 'Thanh toan bang vi thanh cong',
        };
      } catch (error) {
        payment.status = InstructorSubscriptionPaymentStatus.FAILED;
        await this.paymentRepo.save(payment);
        throw error;
      }
    }

    return {
      transactionId: payment.transactionId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      plan,
      paymentChannel,
      expiresAt: payment.expiresAt,
      bankName: this.getSepayBankName(),
      accountNumber: this.getSepayAccountNumber(),
      qrImageUrl: this.buildSepayQrUrl(amount, payment.transactionId),
      message: 'Vui long quet ma QR SePay va doi webhook xac nhan',
    };
  }

  async confirmCheckout(teacherId: string, transactionId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { transactionId, teacherId },
      relations: ['plan'],
    });
    if (!payment) {
      throw new NotFoundException('Khong tim thay giao dich');
    }

    if (payment.status === InstructorSubscriptionPaymentStatus.PAID) {
      return {
        payment,
        subscription: await this.getTeacherSubscription(teacherId),
      };
    }

    if (payment.status !== InstructorSubscriptionPaymentStatus.PENDING) {
      throw new BadRequestException(
        'Giao dich khong o trang thai cho xac nhan',
      );
    }

    if (this.isPendingPaymentExpired(payment)) {
      payment.status = InstructorSubscriptionPaymentStatus.EXPIRED;
      await this.paymentRepo.save(payment);
      throw new BadRequestException('Giao dich da het han');
    }

    const subscription = await this.applyPlanToTeacher(
      teacherId,
      payment.plan,
      payment.paymentMethod,
    );

    payment.status = InstructorSubscriptionPaymentStatus.PAID;
    payment.paidAt = new Date();
    payment.subscriptionId = subscription.id;
    const savedPayment = await this.paymentRepo.save(payment);

    return {
      payment: savedPayment,
      subscription,
      message: 'Thanh toan thanh cong, da kich hoat goi',
    };
  }

  async getCheckoutStatus(teacherId: string, transactionId: string) {
    await this.syncExpiredInstructorPayments();
    await this.reconcilePendingQrByTeacher(teacherId);

    const payment = await this.paymentRepo.findOne({
      where: { teacherId, transactionId },
      relations: ['plan', 'subscription'],
    });

    if (!payment) {
      throw new NotFoundException('Khong tim thay giao dich');
    }

    if (
      payment.status === InstructorSubscriptionPaymentStatus.PENDING &&
      this.isPendingPaymentExpired(payment)
    ) {
      payment.status = InstructorSubscriptionPaymentStatus.EXPIRED;
      await this.paymentRepo.save(payment);
    }

    return {
      payment,
      checkout:
        payment.status === InstructorSubscriptionPaymentStatus.PENDING &&
        payment.paymentMethod === 'sepay_qr'
          ? {
              transactionId: payment.transactionId,
              expiresAt: payment.expiresAt,
              bankName: this.getSepayBankName(),
              accountNumber: this.getSepayAccountNumber(),
              qrImageUrl: this.buildSepayQrUrl(
                Number(payment.amount || 0),
                payment.transactionId,
              ),
            }
          : null,
    };
  }

  async cancelCheckout(teacherId: string, transactionId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { teacherId, transactionId },
    });

    if (!payment) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }

    if (payment.status !== InstructorSubscriptionPaymentStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể hủy giao dịch ở trạng thái Chờ xử lý');
    }

    // Mark payment as failed
    payment.status = InstructorSubscriptionPaymentStatus.FAILED;
    payment.metadata = {
      ...(payment.metadata || {}),
      failureReason: 'user_cancelled',
      cancelledAt: new Date().toISOString(),
    };
    await this.paymentRepo.save(payment);

    return {
      success: true,
      message: 'Giao dịch đã được hủy',
      payment,
    };
  }

  async handleSepayWebhook(webhookData: SepayWebhookDto): Promise<{
    success: boolean;
    message: string;
    paymentId?: string;
  }> {
    if (webhookData.transferType !== 'in' || webhookData.transferAmount <= 0) {
      return {
        success: false,
        message: 'Ignoring non-incoming transfer',
      };
    }

    const normalizedAmount = this.normalizeAmount(webhookData.transferAmount);
    const transferCode = this.resolveTransferCode(webhookData.content);

    let payment: InstructorSubscriptionPayment | null = null;

    if (transferCode) {
      const matchedByCode = await this.paymentRepo.findOne({
        where: { transactionId: transferCode },
        relations: ['plan'],
      });

      if (matchedByCode) {
        if (matchedByCode.status === InstructorSubscriptionPaymentStatus.PAID) {
          return {
            success: true,
            message: 'Payment already processed',
            paymentId: matchedByCode.id,
          };
        }

        if (matchedByCode.status !== InstructorSubscriptionPaymentStatus.PENDING) {
          return {
            success: false,
            message: `Payment is ${matchedByCode.status}`,
            paymentId: matchedByCode.id,
          };
        }

        payment = matchedByCode;
      }
    }

    if (!payment) {
      const validFrom = new Date(
        Date.now() - InstructorSubscriptionsService.PAYMENT_EXPIRE_MS,
      );

      payment = await this.paymentRepo
        .createQueryBuilder('payment')
        .leftJoinAndSelect('payment.plan', 'plan')
        .where('payment.status = :status', {
          status: InstructorSubscriptionPaymentStatus.PENDING,
        })
        .andWhere('payment.paymentMethod = :paymentMethod', {
          paymentMethod: 'sepay_qr',
        })
        .andWhere('payment.amount = :amount', { amount: normalizedAmount })
        .andWhere('payment.createdAt >= :validFrom', { validFrom })
        .orderBy('payment.createdAt', 'DESC')
        .getOne();
    }

    if (!payment) {
      return {
        success: false,
        message: 'No matching instructor payment',
      };
    }

    if (this.isPendingPaymentExpired(payment)) {
      payment.status = InstructorSubscriptionPaymentStatus.EXPIRED;
      await this.paymentRepo.save(payment);

      return {
        success: false,
        message: 'Instructor payment expired',
        paymentId: payment.id,
      };
    }

    const expectedAmount = this.normalizeAmount(Number(payment.amount || 0));
    if (Math.abs(expectedAmount - normalizedAmount) > 0.01) {
      this.logger.warn(
        `Instructor SePay amount mismatch for payment ${payment.id}: expected=${expectedAmount}, actual=${normalizedAmount}`,
      );
      return {
        success: false,
        message: 'Amount mismatch',
        paymentId: payment.id,
      };
    }

    const subscription = await this.applyPlanToTeacher(
      payment.teacherId,
      payment.plan,
      payment.paymentMethod,
    );

    payment.status = InstructorSubscriptionPaymentStatus.PAID;
    payment.paidAt = new Date();
    payment.subscriptionId = subscription.id;
    payment.webhookProcessedAt = new Date();
    payment.sepayTransactionId = webhookData.id || null;
    payment.metadata = {
      ...(payment.metadata || {}),
      sepayWebhook: {
        id: webhookData.id || null,
        content: webhookData.content || null,
        transactionDate: webhookData.transactionDate || null,
      },
    };

    await this.paymentRepo.save(payment);

    return {
      success: true,
      message: 'Instructor payment processed',
      paymentId: payment.id,
    };
  }

  async upgradePlan(teacherId: string, dto: UpgradeSubscriptionDto) {
    const plan = await this.planRepo.findOne({
      where: { id: dto.planId, isActive: true },
    });
    if (!plan) throw new NotFoundException('Goi nang cap khong ton tai');

    const subscription = await this.applyPlanToTeacher(
      teacherId,
      plan,
      dto.paymentMethod || null,
    );

    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        transactionId: this.generateTx(),
        teacherId,
        planId: plan.id,
        subscriptionId: subscription.id,
        amount: Number(plan.price || 0),
        currency: 'VND',
        paymentMethod: dto.paymentMethod || 'manual',
        status: InstructorSubscriptionPaymentStatus.PAID,
        paidAt: new Date(),
        metadata: {
          ...(dto.metadata || {}),
          planCode: this.toPlanCode(plan),
          paymentChannel: dto.paymentChannel || dto.paymentMethod || 'manual',
        },
      }),
    );

    return { subscription, payment, plan };
  }

  async cancelSubscription(teacherId: string, reason?: string) {
    const freePlan = await this.getOrCreateFreePlan();

    const activeSubscriptions = await this.subscriptionRepo.find({
      where: { teacherId, status: InstructorSubscriptionStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    if (activeSubscriptions.length === 0) {
      const now = new Date();
      await this.subscriptionRepo.save(
        this.subscriptionRepo.create({
          teacherId,
          planId: freePlan.id,
          status: InstructorSubscriptionStatus.ACTIVE,
          startDate: now,
          endDate: this.addMonths(now, freePlan.durationMonths || 1),
          autoRenew: false,
          paymentMethod: null,
          cancelReason: reason || 'Cancelled to free plan',
        }),
      );
      return this.getTeacherSubscription(teacherId);
    }

    const current = activeSubscriptions[0];
    const now = new Date();

    current.planId = freePlan.id;
    current.status = InstructorSubscriptionStatus.ACTIVE;
    current.startDate = now;
    current.endDate = this.addMonths(now, freePlan.durationMonths || 1);
    current.autoRenew = false;
    current.paymentMethod = null;
    current.cancelReason = reason || 'User cancelled';

    const toClose = activeSubscriptions.slice(1).map((item) => {
      item.status = InstructorSubscriptionStatus.CANCELLED;
      item.cancelReason = item.cancelReason || 'Closed after cancellation';
      return item;
    });

    await this.subscriptionRepo.save([current, ...toClose]);

    return this.getTeacherSubscription(teacherId);
  }

  async getAdminSubscriptions() {
    const subs = await this.subscriptionRepo.find({
      relations: ['teacher', 'plan'],
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      subs.map(async (sub) => {
        const coursesCreated = await this.courseRepo.count({
          where: { teacherId: sub.teacherId },
        });
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

  async updateAdminSubscription(
    id: string,
    payload: {
      status?: string;
      endDate?: string;
      cancelReason?: string | null;
    },
    actor?: User,
  ) {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id },
      relations: ['teacher', 'plan'],
    });

    if (!subscription) {
      throw new NotFoundException('Khong tim thay subscription');
    }

    if (payload.status !== undefined) {
      const nextStatus = String(payload.status || '').toLowerCase();
      const validStatuses = Object.values(InstructorSubscriptionStatus);
      if (!validStatuses.includes(nextStatus as InstructorSubscriptionStatus)) {
        throw new BadRequestException('Trang thai subscription khong hop le');
      }
      subscription.status = nextStatus as InstructorSubscriptionStatus;
    }

    if (payload.endDate !== undefined) {
      const parsed = new Date(payload.endDate);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('Ngay het han khong hop le');
      }
      subscription.endDate = parsed;
    }

    if (payload.cancelReason !== undefined) {
      subscription.cancelReason = this.toNullableText(payload.cancelReason);
    }

    const saved = await this.subscriptionRepo.save(subscription);

    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        action: 'instructor_subscription.admin_update',
        entityType: 'instructor_subscription',
        entityId: saved.id,
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? null,
        metadata: {
          teacherId: saved.teacherId,
          planId: saved.planId,
          status: saved.status,
          endDate: saved.endDate,
          cancelReason: saved.cancelReason,
        },
      }),
    );

    return this.subscriptionRepo.findOne({
      where: { id: saved.id },
      relations: ['teacher', 'plan'],
    });
  }

  async getAdminPayments() {
    await this.syncExpiredInstructorPayments();
    await this.reconcilePendingQrByTeacher();

    return this.paymentRepo.find({
      relations: ['teacher', 'plan'],
      order: { createdAt: 'DESC' },
    });
  }

  async confirmPayment(id: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id },
      relations: ['plan'],
    });
    if (!payment) throw new NotFoundException('Khong tim thay giao dich');

    const subscription = await this.applyPlanToTeacher(
      payment.teacherId,
      payment.plan,
      payment.paymentMethod,
    );

    payment.status = InstructorSubscriptionPaymentStatus.PAID;
    payment.paidAt = new Date();
    payment.subscriptionId = subscription.id;
    return this.paymentRepo.save(payment);
  }

  async refundPayment(id: string) {
    const payment = await this.paymentRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException('Khong tim thay giao dich');
    payment.status = InstructorSubscriptionPaymentStatus.REFUNDED;
    return this.paymentRepo.save(payment);
  }

  async getRevenueDashboard() {
    const payments = await this.paymentRepo.find({
      where: { status: InstructorSubscriptionPaymentStatus.PAID },
    });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalRevenue = payments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );
    const monthlyRevenue = payments
      .filter((p) => p.createdAt >= monthStart)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const [activeUsers, paidUsers] = await Promise.all([
      this.userRepo.count({ where: { role: UserRole.TEACHER } }),
      this.subscriptionRepo
        .createQueryBuilder('s')
        .leftJoin('s.plan', 'plan')
        .where('s.status = :status', {
          status: InstructorSubscriptionStatus.ACTIVE,
        })
        .andWhere('plan.price > 0')
        .getCount(),
    ]);

    const conversionRate =
      activeUsers > 0 ? (paidUsers / activeUsers) * 100 : 0;

    const monthlyPoints = [] as Array<{
      month: string;
      revenue: number;
      upgradedUsers: number;
    }>;
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthPayments = payments.filter(
        (p) => p.createdAt >= start && p.createdAt < end,
      );
      const upgradedUsers = new Set(monthPayments.map((p) => p.teacherId)).size;
      monthlyPoints.push({
        month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        revenue: monthPayments.reduce(
          (sum, p) => sum + Number(p.amount || 0),
          0,
        ),
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
