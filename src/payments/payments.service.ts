import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
} from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { User } from '../users/entities/user.entity';
import { Course, CourseStatus } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import { LessonProgress } from '../lesson-progress/entities/lesson-progress.entity';
import { CouponsService } from '../coupons/coupons.service';
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

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

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
  ) {}

  private sanitizeMetadata(metadata: unknown): Record<string, unknown> {
    if (!metadata || typeof metadata !== 'object') {
      return {};
    }
    return { ...(metadata as Record<string, unknown>) };
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

    const expectedAmount = Number(course.discountPrice || course.price || 0);

    let discountAmount = Number(createPaymentDto.discountAmount || 0);
    let couponCode: string | null = null;

    if (createPaymentDto.couponCode?.trim()) {
      const normalizedCode = createPaymentDto.couponCode.trim().toUpperCase();
      const couponResult = await this.couponsService.validateCoupon(
        normalizedCode,
        course.id,
      );

      if (!couponResult.valid) {
        throw new BadRequestException(
          couponResult.message || 'Mã thanh toán không hợp lệ',
        );
      }

      discountAmount = Number(couponResult.discount || 0);
      couponCode = normalizedCode;
      await this.couponsService.applyCoupon(normalizedCode);
    }

    if (discountAmount < 0) {
      throw new BadRequestException('Giảm giá không hợp lệ');
    }

    const finalAmount = Math.max(0, expectedAmount - discountAmount);

    const transactionId =
      createPaymentDto.transactionId || this.generateTransactionId();

    const payment = this.paymentRepository.create({
      transactionId,
      studentId: student.id,
      courseId: createPaymentDto.courseId,
      amount: expectedAmount,
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
      await this.createEnrollmentForPayment(savedPayment);
    }

    return savedPayment;
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

    if (success) {
      payment.status = PaymentStatus.COMPLETED;
      payment.paidAt = new Date();

      // Create enrollment after successful payment
      await this.createEnrollmentForPayment(payment);
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
      await this.createEnrollmentForPayment(payment);
    } else {
      payment.status = PaymentStatus.FAILED;
    }

    this.logger.log(
      `Processed payment by transaction ${transactionId}: ${success ? 'SUCCESS' : 'FAILED'}`,
    );

    return this.paymentRepository.save(payment);
  }

  private async createEnrollmentForPayment(payment: Payment): Promise<void> {
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
    return this.paymentRepository.find({
      where: { studentId },
      relations: ['course'],
      order: { createdAt: 'DESC' },
    });
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
