import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
  PaymentType,
} from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { User } from '../users/entities/user.entity';
import { Course, CourseStatus } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import { LessonProgress } from '../lesson-progress/entities/lesson-progress.entity';
import { CouponsService } from '../coupons/coupons.service';
import { WalletService } from '../wallet/wallet.service';
import { CreateSepayCartPaymentDto } from './dto/create-sepay-cart-payment.dto';
import { CreateSepayCoursePaymentDto } from './dto/create-sepay-course-payment.dto';
import { CreateWalletTopupDto } from './dto/create-wallet-topup.dto';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';
import PDFDocument from 'pdfkit';

type PaymentFilters = {
  page: number;
  limit: number;
  status?: string;
  userId?: string;
  courseId?: string;
  teacherId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
};

type PdfTextAlign = 'left' | 'center' | 'right' | 'justify';

type PdfDocumentLike = {
  on(
    event: 'data',
    listener: (chunk: Buffer | string) => void,
  ): PdfDocumentLike;
  on(event: 'end', listener: () => void): PdfDocumentLike;
  on(event: 'error', listener: (error: Error) => void): PdfDocumentLike;
  fontSize(size: number): PdfDocumentLike;
  font(name: string): PdfDocumentLike;
  text(
    text: string,
    x?: number,
    y?: number,
    options?: { align?: PdfTextAlign },
  ): PdfDocumentLike;
  moveTo(x: number, y: number): PdfDocumentLike;
  lineTo(x: number, y: number): PdfDocumentLike;
  stroke(): PdfDocumentLike;
  end(): void;
};

type RevenueRow = { total: string | null };

type SepayWebhookDebugOptions = {
  paymentId?: string;
  transactionCode?: string;
  forcePending?: boolean;
  resetExpiry?: boolean;
  processWebhook?: boolean;
  webhookOverrides?: {
    id?: string;
    transferType?: 'in' | 'out';
    transferAmount?: number;
    content?: string;
    transactionDate?: string;
    accountNumber?: string;
  };
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private static readonly PAYMENT_EXPIRE_MS = 15 * 60 * 1000;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepository: Repository<LessonProgress>,
    private readonly couponsService: CouponsService,
    private readonly walletService: WalletService,
  ) {}

  private sanitizeMetadata(metadata: unknown): Record<string, unknown> {
    if (!metadata || typeof metadata !== 'object') {
      return {};
    }
    return { ...(metadata as Record<string, unknown>) };
  }

  private normalizeAmount(value: number): number {
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) {
      throw new BadRequestException('So tien khong hop le');
    }
    return Number(normalized.toFixed(2));
  }

  private isPendingPaymentExpired(payment: Pick<Payment, 'expiresAt'>): boolean {
    if (!payment.expiresAt) {
      return false;
    }

    return payment.expiresAt.getTime() <= Date.now();
  }

  private async getCreditedTopupPaymentIds(
    userId: string,
  ): Promise<Set<string>> {
    const transactions = await this.walletService.getTransactions(userId, 500);
    const creditedIds = new Set<string>();

    for (const tx of transactions) {
      if (!tx?.paymentId) {
        continue;
      }

      const isTopupCredit =
        tx.type === 'wallet_topup' && Number(tx.changeAmount || 0) > 0;

      if (isTopupCredit) {
        creditedIds.add(String(tx.paymentId));
      }
    }

    return creditedIds;
  }

  private async ensureWalletTopupCredited(
    payment: Pick<Payment, 'id' | 'studentId' | 'amount' | 'finalAmount'>,
    creditedPaymentIds?: Set<string>,
  ): Promise<boolean> {
    if (!payment.studentId) {
      throw new BadRequestException('Wallet topup payment missing user');
    }

    const creditedIds =
      creditedPaymentIds ||
      (await this.getCreditedTopupPaymentIds(payment.studentId));

    if (creditedIds.has(payment.id)) {
      return false;
    }

    const topupAmount = this.normalizeAmount(
      Number(payment.finalAmount ?? payment.amount ?? 0),
    );

    await this.walletService.creditBalance(
      payment.studentId,
      topupAmount,
      'wallet_topup',
      {
        paymentId: payment.id,
        description: 'Nạp tiền vào ví qua SePay',
      },
    );

    creditedIds.add(payment.id);
    return true;
  }

  private generateTransactionCode(prefix: string): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  private getSepayBankName(): string {
    return process.env.SEPAY_BANK_NAME || process.env.BANK_NAME || 'BIDV';
  }

  private getSepayAccountNumber(): string {
    return (
      process.env.SEPAY_BANK_ACCOUNT_NUMBER ||
      process.env.BANK_ACCOUNT_NUMBER ||
      '9624723T11'
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

  private resolveTransferCode(content?: string): string | null {
    if (!content) {
      return null;
    }

    const normalized = content.toUpperCase();
    const patterns = [/NAP\d+[A-Z0-9]+/, /CRS\d+[A-Z0-9]+/, /SUB-[A-Z0-9-]+/];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match?.[0]) {
        return match[0];
      }
    }

    return null;
  }

  private async resolveCoursePrice(
    course: Course,
    couponCode?: string,
  ): Promise<{
    amount: number;
    discountAmount: number;
    finalAmount: number;
    couponCode: string | null;
  }> {
    const basePrice = this.normalizeAmount(Number(course.price ?? 0));
    const discountPrice = this.normalizeAmount(Number(course.discountPrice ?? 0));
    // Use discount price only when it is a real reduced price, not default 0.00.
    const effectiveCoursePrice =
      discountPrice > 0 && discountPrice < basePrice ? discountPrice : basePrice;
    const expectedAmount = this.normalizeAmount(Math.max(0, effectiveCoursePrice));

    let discountAmount = 0;
    let normalizedCouponCode: string | null = null;

    if (couponCode?.trim()) {
      normalizedCouponCode = couponCode.trim().toUpperCase();
      const couponResult = await this.couponsService.validateCoupon(
        normalizedCouponCode,
        course.id,
      );

      if (!couponResult.valid) {
        throw new BadRequestException(
          couponResult.message || 'Ma thanh toan khong hop le',
        );
      }

      discountAmount = this.normalizeAmount(Number(couponResult.discount || 0));
      await this.couponsService.applyCoupon(normalizedCouponCode);
    }

    if (discountAmount < 0) {
      throw new BadRequestException('Giam gia khong hop le');
    }

    const finalAmount = this.normalizeAmount(
      Math.max(0, expectedAmount - discountAmount),
    );

    return {
      amount: expectedAmount,
      discountAmount,
      finalAmount,
      couponCode: normalizedCouponCode,
    };
  }

  async create(
    createPaymentDto: CreatePaymentDto,
    student: User,
  ): Promise<Payment> {
    const course = await this.courseRepository.findOne({
      where: { id: createPaymentDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tìm thấy');
    }

    // ✅ Validate course status
    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException('Khóa học không khả dụng');
    }

    // Check if already enrolled
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: {
        studentId: student.id,
        courseId: createPaymentDto.courseId,
      },
    });

    if (existingEnrollment) {
      throw new ConflictException('Đã đăng ký khóa học này rồi');
    }

    const { amount, discountAmount, finalAmount, couponCode } =
      await this.resolveCoursePrice(course, createPaymentDto.couponCode);

    const transactionId =
      createPaymentDto.transactionId || this.generateTransactionId();

    const payment = this.paymentRepository.create({
      transactionId,
      studentId: student.id,
      courseId: createPaymentDto.courseId,
      amount,
      discountAmount,
      finalAmount,
      currency: createPaymentDto.currency || 'VND',
      paymentMethod:
        createPaymentDto.paymentMethod || PaymentMethod.BANK_TRANSFER,
      paymentGatewayId: createPaymentDto.paymentGatewayId,
      status:
        finalAmount === 0 ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
      ...(finalAmount === 0 ? { paidAt: new Date() } : {}),
      metadata: {
        ...this.sanitizeMetadata(createPaymentDto.metadata),
        ...(couponCode ? { couponCode } : {}),
      },
    });

    this.logger.log(
      `Created payment ${transactionId} for course ${createPaymentDto.courseId}`,
    );

    const savedPayment = await this.paymentRepository.save(payment);

    if (savedPayment.status === PaymentStatus.COMPLETED) {
      await this.createEnrollmentsForPayment(savedPayment);
    }

    return savedPayment;
  }

  async createSepayCoursePayment(
    dto: CreateSepayCoursePaymentDto,
    student: User,
  ) {
    const course = await this.courseRepository.findOne({
      where: { id: dto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Khoa hoc khong tim thay');
    }

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException('Khoa hoc khong kha dung');
    }

    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: {
        studentId: student.id,
        courseId: dto.courseId,
      },
    });

    if (existingEnrollment) {
      throw new ConflictException('Đã đăng ký khóa học này rồi');
    }

    const { amount, discountAmount, finalAmount, couponCode } =
      await this.resolveCoursePrice(course, dto.couponCode);

    const transactionCode = this.generateTransactionCode('CRS');
    const expiresAt = new Date(Date.now() + PaymentsService.PAYMENT_EXPIRE_MS);

    const payment = this.paymentRepository.create({
      transactionId: this.generateTransactionId(),
      transactionCode,
      studentId: student.id,
      courseId: dto.courseId,
      paymentType: PaymentType.COURSE_ENROLLMENT,
      amount,
      discountAmount,
      finalAmount,
      currency: 'VND',
      paymentMethod: PaymentMethod.SEPAY_QR,
      status:
        finalAmount === 0 ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
      ...(finalAmount === 0 ? { paidAt: new Date() } : { expiresAt }),
      metadata: {
        couponCode,
        source: 'course_checkout',
      },
    });

    const savedPayment = await this.paymentRepository.save(payment);

    if (savedPayment.status === PaymentStatus.COMPLETED) {
      await this.createEnrollmentsForPayment(savedPayment);
      return {
        payment: savedPayment,
        checkout: null,
      };
    }

    return {
      payment: savedPayment,
      checkout: {
        transactionCode,
        expiresAt,
        bankName: this.getSepayBankName(),
        accountNumber: this.getSepayAccountNumber(),
        qrImageUrl: this.buildSepayQrUrl(finalAmount, transactionCode),
      },
    };
  }

  async createSepayCartPayment(dto: CreateSepayCartPaymentDto, student: User) {
    const uniqueCourseIds = Array.from(
      new Set((dto.courseIds || []).map((id) => String(id || '').trim())),
    ).filter(Boolean);

    if (uniqueCourseIds.length === 0) {
      throw new BadRequestException('Danh sach khoa hoc khong hop le');
    }

    if (uniqueCourseIds.length === 1) {
      return this.createSepayCoursePayment(
        {
          courseId: uniqueCourseIds[0],
          couponCode: dto.couponCode,
        },
        student,
      );
    }

    if (dto.couponCode?.trim()) {
      throw new BadRequestException(
        'Thanh toan nhieu khoa hoc hien chua ho tro ma giam gia',
      );
    }

    const courses = await this.courseRepository.find({
      where: { id: In(uniqueCourseIds) },
    });

    if (courses.length !== uniqueCourseIds.length) {
      throw new NotFoundException('Co khoa hoc khong ton tai trong gio hang');
    }

    const courseMap = new Map(courses.map((course) => [course.id, course]));
    const orderedCourses = uniqueCourseIds.map((courseId) =>
      courseMap.get(courseId),
    );

    if (orderedCourses.some((course) => !course)) {
      throw new NotFoundException('Co khoa hoc khong ton tai trong gio hang');
    }

    for (const course of orderedCourses as Course[]) {
      if (course.status !== CourseStatus.PUBLISHED) {
        throw new BadRequestException(
          `Khoa hoc ${course.title || course.id} khong kha dung`,
        );
      }
    }

    const enrolled = await this.enrollmentRepository.find({
      where: {
        studentId: student.id,
        courseId: In(uniqueCourseIds),
      },
      select: ['courseId'],
    });

    if (enrolled.length > 0) {
      throw new ConflictException('Đã đăng ký một số khóa học trong danh sách');
    }

    const resolvedPrices = await Promise.all(
      (orderedCourses as Course[]).map((course) =>
        this.resolveCoursePrice(course),
      ),
    );

    const amount = this.normalizeAmount(
      resolvedPrices.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    );
    const discountAmount = this.normalizeAmount(
      resolvedPrices.reduce(
        (sum, item) => sum + Number(item.discountAmount || 0),
        0,
      ),
    );
    const finalAmount = this.normalizeAmount(
      resolvedPrices.reduce(
        (sum, item) => sum + Number(item.finalAmount || 0),
        0,
      ),
    );

    const transactionCode = this.generateTransactionCode('CRS');
    const expiresAt = new Date(Date.now() + PaymentsService.PAYMENT_EXPIRE_MS);

    const payment = this.paymentRepository.create({
      transactionId: this.generateTransactionId(),
      transactionCode,
      studentId: student.id,
      courseId: uniqueCourseIds[0],
      paymentType: PaymentType.COURSE_ENROLLMENT,
      amount,
      discountAmount,
      finalAmount,
      currency: 'VND',
      paymentMethod: PaymentMethod.SEPAY_QR,
      status:
        finalAmount === 0 ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
      ...(finalAmount === 0 ? { paidAt: new Date() } : { expiresAt }),
      metadata: {
        source: 'multi_course_checkout',
        courseIds: uniqueCourseIds,
        lineItems: resolvedPrices.map((item, index) => ({
          courseId: uniqueCourseIds[index],
          amount: item.amount,
          discountAmount: item.discountAmount,
          finalAmount: item.finalAmount,
        })),
      },
    });

    const savedPayment = await this.paymentRepository.save(payment);

    if (savedPayment.status === PaymentStatus.COMPLETED) {
      await this.createEnrollmentsForPayment(savedPayment);
      return {
        payment: savedPayment,
        checkout: null,
      };
    }

    return {
      payment: savedPayment,
      checkout: {
        transactionCode,
        expiresAt,
        bankName: this.getSepayBankName(),
        accountNumber: this.getSepayAccountNumber(),
        qrImageUrl: this.buildSepayQrUrl(finalAmount, transactionCode),
      },
    };
  }

  async createWalletTopupSepay(dto: CreateWalletTopupDto, user: User) {
    const amount = this.normalizeAmount(dto.amount);
    const transactionCode = this.generateTransactionCode('NAP');
    const expiresAt = new Date(Date.now() + PaymentsService.PAYMENT_EXPIRE_MS);

    const payment = this.paymentRepository.create({
      transactionId: this.generateTransactionId(),
      transactionCode,
      studentId: user.id,
      paymentType: PaymentType.WALLET_TOPUP,
      amount,
      discountAmount: 0,
      finalAmount: amount,
      currency: 'VND',
      paymentMethod: PaymentMethod.SEPAY_QR,
      status: PaymentStatus.PENDING,
      expiresAt,
      metadata: {
        source: 'wallet_topup',
      },
    });

    const savedPayment = await this.paymentRepository.save(payment);

    return {
      payment: savedPayment,
      checkout: {
        transactionCode,
        expiresAt,
        bankName: this.getSepayBankName(),
        accountNumber: this.getSepayAccountNumber(),
        qrImageUrl: this.buildSepayQrUrl(amount, transactionCode),
      },
    };
  }

  async payCourseByWallet(dto: CreateSepayCoursePaymentDto, student: User) {
    const course = await this.courseRepository.findOne({
      where: { id: dto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Khoa hoc khong tim thay');
    }

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException('Khoa hoc khong kha dung');
    }

    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: {
        studentId: student.id,
        courseId: dto.courseId,
      },
    });

    if (existingEnrollment) {
      throw new ConflictException('Đã đăng ký khóa học này rồi');
    }

    const { amount, discountAmount, finalAmount, couponCode } =
      await this.resolveCoursePrice(course, dto.couponCode);

    const payment = this.paymentRepository.create({
      transactionId: this.generateTransactionId(),
      studentId: student.id,
      courseId: dto.courseId,
      paymentType: PaymentType.COURSE_ENROLLMENT,
      amount,
      discountAmount,
      finalAmount,
      currency: 'VND',
      paymentMethod: PaymentMethod.WALLET,
      status: PaymentStatus.PENDING,
      metadata: {
        couponCode,
        source: 'wallet_course_payment',
      },
    });

    const savedPayment = await this.paymentRepository.save(payment);

    try {
      if (finalAmount > 0) {
        await this.walletService.debitBalance(student.id, finalAmount, 'course_payment', {
          paymentId: savedPayment.id,
          description: `Thanh toan khoa hoc ${course.title}`,
          metadata: {
            courseId: course.id,
          },
        });
      }

      savedPayment.status = PaymentStatus.COMPLETED;
      savedPayment.paidAt = new Date();
      const completedPayment = await this.paymentRepository.save(savedPayment);
      await this.createEnrollmentsForPayment(completedPayment);
      return completedPayment;
    } catch (error) {
      savedPayment.status = PaymentStatus.FAILED;
      savedPayment.failureReason =
        error instanceof Error ? error.message : 'Wallet payment failed';
      await this.paymentRepository.save(savedPayment);
      throw error;
    }
  }

  async getSepayPaymentStatus(transactionCode: string, userId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { transactionCode, studentId: userId },
      relations: ['course'],
    });

    if (!payment) {
      throw new NotFoundException('Khong tim thay giao dich');
    }

    if (
      payment.status === PaymentStatus.PENDING &&
      this.isPendingPaymentExpired(payment)
    ) {
      payment.status = PaymentStatus.EXPIRED;
      await this.paymentRepository.save(payment);
    }

    if (
      payment.status === PaymentStatus.COMPLETED &&
      payment.paymentType === PaymentType.WALLET_TOPUP
    ) {
      try {
        await this.ensureWalletTopupCredited(payment);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown wallet credit error';
        this.logger.error(
          `Failed to reconcile topup credit for payment ${payment.id}: ${message}`,
        );
      }
    }

    return {
      payment,
      checkout:
        payment.status === PaymentStatus.PENDING &&
        payment.paymentMethod === PaymentMethod.SEPAY_QR
          ? {
              transactionCode: payment.transactionCode,
              expiresAt: payment.expiresAt,
              bankName: this.getSepayBankName(),
              accountNumber: this.getSepayAccountNumber(),
              qrImageUrl: this.buildSepayQrUrl(
                Number(payment.finalAmount || payment.amount || 0),
                payment.transactionCode || '',
              ),
            }
          : null,
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

    let payment: Payment | null = null;

    if (transferCode) {
      payment = await this.paymentRepository.findOne({
        where: {
          transactionCode: transferCode,
          paymentMethod: PaymentMethod.SEPAY_QR,
        },
      });

      if (payment?.status === PaymentStatus.COMPLETED) {
        if (payment.paymentType === PaymentType.WALLET_TOPUP) {
          await this.ensureWalletTopupCredited(payment);
        }

        return {
          success: true,
          message: 'Payment already processed',
          paymentId: payment.id,
        };
      }

      if (payment && payment.status !== PaymentStatus.PENDING) {
        return {
          success: false,
          message: `Payment is ${payment.status}`,
          paymentId: payment.id,
        };
      }
    }

    if (!payment) {
      const validFrom = new Date(Date.now() - PaymentsService.PAYMENT_EXPIRE_MS);

      payment = await this.paymentRepository
        .createQueryBuilder('payment')
        .where('payment.status = :status', { status: PaymentStatus.PENDING })
        .andWhere('payment.paymentMethod = :method', {
          method: PaymentMethod.SEPAY_QR,
        })
        .andWhere('(payment.finalAmount = :amount OR payment.amount = :amount)', {
          amount: normalizedAmount,
        })
        .andWhere('payment.createdAt >= :validFrom', { validFrom })
        .orderBy('payment.createdAt', 'DESC')
        .getOne();
    }

    if (!payment) {
      return {
        success: false,
        message: 'No matching pending payment',
      };
    }

    if (this.isPendingPaymentExpired(payment)) {
      payment.status = PaymentStatus.EXPIRED;
      await this.paymentRepository.save(payment);
      return {
        success: false,
        message: 'Payment expired',
        paymentId: payment.id,
      };
    }

    const expectedAmount = this.normalizeAmount(
      Number(payment.finalAmount || payment.amount || 0),
    );
    if (Math.abs(expectedAmount - normalizedAmount) > 0.01) {
      this.logger.warn(
        `SePay amount mismatch for payment ${payment.id}: expected=${expectedAmount}, actual=${normalizedAmount}`,
      );
      return {
        success: false,
        message: 'Amount mismatch',
        paymentId: payment.id,
      };
    }

    payment.paidAt = new Date();
    payment.webhookProcessedAt = new Date();
    payment.sepayTransactionId = webhookData.id || null;
    payment.gatewayTransactionId = webhookData.id || null;
    payment.metadata = {
      ...this.sanitizeMetadata(payment.metadata),
      sepayWebhook: {
        id: webhookData.id || null,
        content: webhookData.content || null,
        transactionDate: webhookData.transactionDate || null,
        accountNumber: webhookData.accountNumber || null,
      },
    };

    if (payment.paymentType === PaymentType.WALLET_TOPUP) {
      await this.ensureWalletTopupCredited(payment);
    }

    payment.status = PaymentStatus.COMPLETED;
    const savedPayment = await this.paymentRepository.save(payment);

    await this.createEnrollmentsForPayment(savedPayment);

    return {
      success: true,
      message: 'Payment processed',
      paymentId: savedPayment.id,
    };
  }

  async debugSepayWebhookForOrder(options: SepayWebhookDebugOptions): Promise<{
    success: boolean;
    target: Record<string, unknown>;
    webhook: SepayWebhookDto;
    diagnosis: Record<string, unknown>;
    webhookResult: {
      success: boolean;
      message: string;
      paymentId?: string;
    } | null;
    before: Record<string, unknown>;
    after: Record<string, unknown> | null;
  }> {
    if (!options.paymentId && !options.transactionCode) {
      throw new BadRequestException('Can cung cap paymentId hoac transactionCode');
    }

    const targetPayment = await this.paymentRepository.findOne({
      where: options.paymentId
        ? { id: options.paymentId }
        : { transactionCode: options.transactionCode || '' },
    });

    if (!targetPayment) {
      throw new NotFoundException('Khong tim thay giao dich SePay can debug');
    }

    if (targetPayment.paymentMethod !== PaymentMethod.SEPAY_QR) {
      throw new BadRequestException('Giao dich nay khong phai SePay QR');
    }

    if (options.forcePending) {
      targetPayment.status = PaymentStatus.PENDING;
      targetPayment.paidAt = null;
      targetPayment.webhookProcessedAt = null;
      targetPayment.failureReason = null;

      if (options.resetExpiry !== false) {
        targetPayment.expiresAt = new Date(
          Date.now() + PaymentsService.PAYMENT_EXPIRE_MS,
        );
      }

      await this.paymentRepository.save(targetPayment);
    }

    const before = await this.paymentRepository.findOne({
      where: { id: targetPayment.id },
    });

    if (!before) {
      throw new NotFoundException('Khong tim thay giao dich truoc khi debug');
    }

    const expectedAmount = this.normalizeAmount(
      Number(before.finalAmount || before.amount || 0),
    );

    const webhookData: SepayWebhookDto = {
      id: options.webhookOverrides?.id || `TEST-${Date.now()}`,
      transferType: options.webhookOverrides?.transferType || 'in',
      transferAmount:
        options.webhookOverrides?.transferAmount ?? expectedAmount,
      content:
        options.webhookOverrides?.content || before.transactionCode || undefined,
      transactionDate:
        options.webhookOverrides?.transactionDate || new Date().toISOString(),
      accountNumber:
        options.webhookOverrides?.accountNumber || this.getSepayAccountNumber(),
    };

    const normalizedAmount = this.normalizeAmount(webhookData.transferAmount);
    const extractedTransferCode = this.resolveTransferCode(webhookData.content);

    const matchedByCode = extractedTransferCode
      ? await this.paymentRepository.findOne({
          where: {
            transactionCode: extractedTransferCode,
            paymentMethod: PaymentMethod.SEPAY_QR,
          },
        })
      : null;

    const validFrom = new Date(Date.now() - PaymentsService.PAYMENT_EXPIRE_MS);
    const fallbackMatchedByAmount = await this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: PaymentStatus.PENDING })
      .andWhere('payment.paymentMethod = :method', {
        method: PaymentMethod.SEPAY_QR,
      })
      .andWhere('(payment.finalAmount = :amount OR payment.amount = :amount)', {
        amount: normalizedAmount,
      })
      .andWhere('payment.createdAt >= :validFrom', { validFrom })
      .orderBy('payment.createdAt', 'DESC')
      .getOne();

    const diagnosis = {
      extractedTransferCode,
      normalizedAmount,
      targetPaymentId: before.id,
      targetTransactionCode: before.transactionCode,
      targetStatus: before.status,
      targetExpectedAmount: expectedAmount,
      targetAmountMatch: Math.abs(expectedAmount - normalizedAmount) <= 0.01,
      targetTransferCodeMatch:
        !!extractedTransferCode && extractedTransferCode === before.transactionCode,
      targetExpiredByTime: this.isPendingPaymentExpired(before),
      matchedByCodePaymentId: matchedByCode?.id || null,
      matchedByCodeStatus: matchedByCode?.status || null,
      matchedByAmountPaymentId: fallbackMatchedByAmount?.id || null,
      matchedByAmountStatus: fallbackMatchedByAmount?.status || null,
      matchedByAmountTransactionCode:
        fallbackMatchedByAmount?.transactionCode || null,
      canBeProcessedNow:
        webhookData.transferType === 'in' &&
        normalizedAmount > 0 &&
        before.status === PaymentStatus.PENDING &&
        !this.isPendingPaymentExpired(before) &&
        Math.abs(expectedAmount - normalizedAmount) <= 0.01,
    };

    let webhookResult: {
      success: boolean;
      message: string;
      paymentId?: string;
    } | null = null;

    if (options.processWebhook !== false) {
      webhookResult = await this.handleSepayWebhook(webhookData);
    }

    const after = webhookResult
      ? await this.paymentRepository.findOne({ where: { id: before.id } })
      : null;

    return {
      success: webhookResult?.success ?? true,
      target: {
        paymentId: before.id,
        transactionCode: before.transactionCode,
      },
      webhook: webhookData,
      diagnosis,
      webhookResult,
      before: {
        status: before.status,
        paymentType: before.paymentType,
        paymentMethod: before.paymentMethod,
        amount: before.amount,
        finalAmount: before.finalAmount,
        createdAt: before.createdAt,
        expiresAt: before.expiresAt,
        paidAt: before.paidAt,
        webhookProcessedAt: before.webhookProcessedAt,
      },
      after: after
        ? {
            status: after.status,
            paymentType: after.paymentType,
            paymentMethod: after.paymentMethod,
            amount: after.amount,
            finalAmount: after.finalAmount,
            createdAt: after.createdAt,
            expiresAt: after.expiresAt,
            paidAt: after.paidAt,
            webhookProcessedAt: after.webhookProcessedAt,
            sepayTransactionId: after.sepayTransactionId,
            gatewayTransactionId: after.gatewayTransactionId,
          }
        : null,
    };
  }

  async processPayment(
    paymentId: string,
    success: boolean,
    reason?: string,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Thanh toán không tìm thấy');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException('Giao dịch đã được xử lý trước đó');
    }

    if (success) {
      payment.status = PaymentStatus.COMPLETED;
      payment.paidAt = new Date();

      if (payment.paymentType === PaymentType.COURSE_ENROLLMENT) {
        // Create enrollment after successful course payment
        await this.createEnrollmentsForPayment(payment);
      } else if (payment.paymentType === PaymentType.WALLET_TOPUP) {
        if (!payment.studentId) {
          throw new BadRequestException('Wallet topup payment missing user');
        }

        const topupAmount = this.normalizeAmount(
          Number(payment.finalAmount ?? payment.amount ?? 0),
        );

        await this.walletService.creditBalance(
          payment.studentId,
          topupAmount,
          'wallet_topup',
          {
            paymentId: payment.id,
            description: 'Nạp tiền vào ví được admin xác nhận',
          },
        );
      }
    } else {
      payment.status = PaymentStatus.FAILED;
      if (reason) {
        payment.failureReason = reason;
      }
    }

    this.logger.log(
      `Processed payment ${payment.id}: ${success ? 'SUCCESS' : 'FAILED'}`,
    );

    return this.paymentRepository.save(payment);
  }

  async processPaymentByTransactionId(
    transactionId: string,
    success: boolean,
    gatewayTransactionId?: string,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { transactionId },
    });

    if (!payment) {
      this.logger.warn(
        `Thanh toán không tìm thấy cho giao dịch: ${transactionId}`,
      );
      throw new NotFoundException('Thanh toán không tìm thấy');
    }

    // Skip if already processed
    if (payment.status !== PaymentStatus.PENDING) {
      this.logger.log(
        `Payment ${transactionId} already processed: ${payment.status}`,
      );
      return payment;
    }

    if (success) {
      payment.status = PaymentStatus.COMPLETED;
      payment.paidAt = new Date();
      if (gatewayTransactionId) {
        payment.gatewayTransactionId = gatewayTransactionId;
      }

      // Create enrollment after successful payment
      await this.createEnrollmentsForPayment(payment);
    } else {
      payment.status = PaymentStatus.FAILED;
    }

    this.logger.log(
      `Processed payment by transaction ${transactionId}: ${success ? 'SUCCESS' : 'FAILED'}`,
    );

    return this.paymentRepository.save(payment);
  }

  private getCourseIdsFromMetadata(metadata: unknown): string[] {
    const sanitized = this.sanitizeMetadata(metadata);
    const value = sanitized.courseIds;

    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  private async createEnrollmentsForPayment(payment: Payment): Promise<void> {
    if (payment.paymentType !== PaymentType.COURSE_ENROLLMENT) {
      return;
    }

    const courseIds = this.getCourseIdsFromMetadata(payment.metadata);
    if (courseIds.length > 0) {
      for (const courseId of courseIds) {
        await this.createEnrollmentForPayment({
          studentId: payment.studentId,
          courseId,
        });
      }
      return;
    }

    if (payment.courseId) {
      await this.createEnrollmentForPayment(payment);
    }
  }

  private async createEnrollmentForPayment(
    payment: Pick<Payment, 'studentId' | 'courseId'>,
  ): Promise<void> {
    if (!payment.studentId || !payment.courseId) {
      return;
    }

    // ✅ Sử dụng transaction với pessimistic lock để tránh race condition
    try {
      await this.enrollmentRepository.manager.transaction(async (manager) => {
        const existing = await manager.findOne(Enrollment, {
          where: {
            studentId: payment.studentId,
            courseId: payment.courseId,
          },
          lock: { mode: 'pessimistic_write' }, // Lock row
        });

        if (existing) {
          this.logger.log(
            `Enrollment already exists for student ${payment.studentId}`,
          );
          return;
        }

        const enrollment = manager.create(Enrollment, {
          studentId: payment.studentId,
          courseId: payment.courseId,
        });
        const savedEnrollment = await manager.save(Enrollment, enrollment);

        await manager.increment(
          Course,
          { id: payment.courseId },
          'enrollmentCount',
          1,
        );

        // Create lesson progress entries for all lessons in the course
        const lessons = await manager.find(Lesson, {
          where: { courseId: payment.courseId },
        });

        const progressEntries = lessons.map((lesson) =>
          manager.create(LessonProgress, {
            enrollmentId: savedEnrollment.id,
            lessonId: lesson.id,
          }),
        );

        if (progressEntries.length > 0) {
          await manager.save(LessonProgress, progressEntries);
        }

        this.logger.log(
          `Created enrollment for student ${payment.studentId} in course ${payment.courseId} with ${lessons.length} lessons`,
        );
      });
    } catch (error) {
      // ✅ Handle duplicate key error gracefully
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: unknown }).code === '23505'
      ) {
        // PostgreSQL unique violation
        this.logger.log(
          `Duplicate enrollment prevented for student ${payment.studentId}`,
        );
        return;
      }
      throw error;
    }
  }

  async findByStudent(studentId: string): Promise<Payment[]> {
    const payments = await this.paymentRepository.find({
      where: { studentId },
      relations: ['course'],
      order: { createdAt: 'DESC' },
    });

    const completedTopups = payments.filter(
      (payment) =>
        payment.status === PaymentStatus.COMPLETED &&
        payment.paymentType === PaymentType.WALLET_TOPUP,
    );

    if (completedTopups.length > 0) {
      try {
        const creditedPaymentIds = await this.getCreditedTopupPaymentIds(
          studentId,
        );

        for (const topupPayment of completedTopups) {
          if (creditedPaymentIds.has(topupPayment.id)) {
            continue;
          }

          await this.ensureWalletTopupCredited(
            topupPayment,
            creditedPaymentIds,
          );

          this.logger.warn(
            `Recovered missing wallet credit for completed topup ${topupPayment.id}`,
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown wallet credit error';
        this.logger.error(
          `Failed to reconcile wallet topups for student ${studentId}: ${message}`,
        );
      }
    }

    return payments;
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['course', 'student'],
    });

    if (!payment) {
      throw new NotFoundException('Thanh toán không tìm thấy');
    }

    return payment;
  }

  async findByTransactionId(transactionId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { transactionId },
      relations: ['course', 'student'],
    });

    if (!payment) {
      throw new NotFoundException('Thanh toán không tìm thấy');
    }

    return payment;
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    status?: PaymentStatus;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ data: Payment[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.course', 'course')
      .leftJoinAndSelect('payment.student', 'student')
      .orderBy('payment.createdAt', 'DESC');

    if (options?.status) {
      queryBuilder.andWhere('payment.status = :status', {
        status: options.status,
      });
    }

    if (options?.startDate) {
      queryBuilder.andWhere('payment.createdAt >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('payment.createdAt <= :endDate', {
        endDate: options.endDate,
      });
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findAllWithFilters(filters: PaymentFilters) {
    const {
      page,
      limit,
      status,
      userId,
      courseId,
      teacherId,
      startDate,
      endDate,
      search,
    } = filters;

    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.student', 'student')
      .leftJoinAndSelect('payment.course', 'course')
      .leftJoinAndSelect('course.teacher', 'teacher');

    if (status) {
      query.andWhere('payment.status = :status', { status });
    }

    if (userId) {
      query.andWhere('payment.studentId = :userId', { userId });
    }

    if (courseId) {
      query.andWhere('payment.courseId = :courseId', { courseId });
    }

    if (teacherId) {
      query.andWhere('course.teacherId = :teacherId', { teacherId });
    }

    if (startDate) {
      query.andWhere('payment.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      query.andWhere('payment.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    if (search) {
      query.andWhere(
        '(student.name ILIKE :search OR student.email ILIKE :search OR course.title ILIKE :search OR payment.transactionId ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query
      .orderBy('payment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentStats(startDate?: string, endDate?: string) {
    const query = this.paymentRepository.createQueryBuilder('payment');

    if (startDate) {
      query.andWhere('payment.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      query.andWhere('payment.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const [total, completed, pending, failed] = await Promise.all([
      query.getCount(),
      query
        .clone()
        .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .getCount(),
      query
        .clone()
        .where('payment.status = :status', { status: PaymentStatus.PENDING })
        .getCount(),
      query
        .clone()
        .where('payment.status = :status', { status: PaymentStatus.FAILED })
        .getCount(),
    ]);

    const revenue = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.finalAmount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne<RevenueRow>();

    const totalRevenue = revenue?.total ? Number.parseFloat(revenue.total) : 0;

    return {
      totalTransactions: total,
      completedTransactions: completed,
      pendingTransactions: pending,
      failedTransactions: failed,
      totalRevenue: Number.isFinite(totalRevenue) ? totalRevenue : 0,
    };
  }

  async exportToCSV(filters: Partial<PaymentFilters>): Promise<string> {
    const { data } = await this.findAllWithFilters({
      page: 1,
      limit: 10000, // Large limit for export
      ...filters,
    });

    const headers = [
      'Transaction ID',
      'Student Name',
      'Student Email',
      'Course Title',
      'Amount',
      'Final Amount',
      'Status',
      'Payment Method',
      'Date',
    ];
    const rows = data.map((p) => [
      p.transactionId,
      p.student?.name || 'N/A',
      p.student?.email || 'N/A',
      p.course?.title || 'N/A',
      p.amount,
      p.finalAmount,
      p.status,
      p.paymentMethod,
      p.createdAt.toISOString(),
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join(
      '\n',
    );

    return csv;
  }

  async generateInvoice(paymentId: string, studentId: string): Promise<Buffer> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['student', 'course', 'course.teacher'],
    });

    if (!payment) {
      throw new NotFoundException('Thanh toán không tìm thấy');
    }

    // Verify ownership
    if (payment.studentId !== studentId) {
      throw new ForbiddenException('Bạn chỉ có thể xem hóa đơn của mình');
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 }) as unknown as PdfDocumentLike;
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer | string) => {
        if (Buffer.isBuffer(chunk)) {
          chunks.push(chunk);
          return;
        }
        chunks.push(Buffer.from(chunk));
      });
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (error: Error) => reject(error));

      // Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('INVOICE', 50, 50, { align: 'center' });

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Invoice #: ${payment.id.substring(0, 8).toUpperCase()}`, 50, 90)
        .text(`Transaction: ${payment.transactionId}`, 50, 105)
        .text(`Date: ${payment.createdAt.toLocaleDateString('en-US')}`, 50, 120)
        .text(`Status: ${payment.status}`, 50, 135);

      // Line separator
      doc.moveTo(50, 160).lineTo(550, 160).stroke();

      // Bill To
      doc.fontSize(12).font('Helvetica-Bold').text('BILL TO:', 50, 180);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(payment.student.name, 50, 200)
        .text(payment.student.email, 50, 215);

      // Course Details
      doc.fontSize(12).font('Helvetica-Bold').text('COURSE DETAILS:', 50, 250);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Course: ${payment.course.title}`, 50, 270)
        .text(`Instructor: ${payment.course.teacher.name}`, 50, 285)
        .text(`Payment Method: ${payment.paymentMethod}`, 50, 300);

      // Line separator
      doc.moveTo(50, 330).lineTo(550, 330).stroke();

      // Payment Details Table
      const tableTop = 350;

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Description', 50, tableTop)
        .text('Amount', 400, tableTop, { align: 'right' });

      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

      doc
        .font('Helvetica')
        .text('Course Enrollment', 50, tableTop + 25)
        .text(
          `${payment.amount.toLocaleString('vi-VN')} VND`,
          400,
          tableTop + 25,
          { align: 'right' },
        );

      if (payment.discountAmount > 0) {
        doc
          .text('Discount', 50, tableTop + 45)
          .text(
            `-${payment.discountAmount.toLocaleString('vi-VN')} VND`,
            400,
            tableTop + 45,
            { align: 'right' },
          );
      }

      // Total
      const totalTop =
        payment.discountAmount > 0 ? tableTop + 70 : tableTop + 50;

      doc.moveTo(50, totalTop).lineTo(550, totalTop).stroke();

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('TOTAL', 50, totalTop + 10)
        .text(
          `${payment.finalAmount.toLocaleString('vi-VN')} VND`,
          400,
          totalTop + 10,
          { align: 'right' },
        );

      doc
        .moveTo(50, totalTop + 30)
        .lineTo(550, totalTop + 30)
        .stroke();

      // Footer
      doc
        .fontSize(8)
        .font('Helvetica')
        .text('Thank you for your purchase!', 50, totalTop + 60, {
          align: 'center',
        })
        .text(
          'For questions about this invoice, please contact support@icslearning.com',
          50,
          totalTop + 75,
          { align: 'center' },
        );

      doc.end();
    });
  }

  private generateTransactionId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `TXN-${timestamp}-${random}`;
  }
}
