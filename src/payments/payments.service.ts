import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';

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
  ) {}

  async create(createPaymentDto: CreatePaymentDto, student: User): Promise<Payment> {
    const course = await this.courseRepository.findOne({
      where: { id: createPaymentDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if already enrolled
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: {
        studentId: student.id,
        courseId: createPaymentDto.courseId,
      },
    });

    if (existingEnrollment) {
      throw new ConflictException('Already enrolled in this course');
    }

    const transactionId = createPaymentDto.transactionId || this.generateTransactionId();

    const payment = this.paymentRepository.create({
      ...createPaymentDto,
      transactionId,
      studentId: student.id,
      status: PaymentStatus.PENDING,
    });

    this.logger.log(`Created payment ${transactionId} for course ${createPaymentDto.courseId}`);

    return this.paymentRepository.save(payment);
  }

  async processPayment(paymentId: string, success: boolean, reason?: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
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

    this.logger.log(`Processed payment ${payment.id}: ${success ? 'SUCCESS' : 'FAILED'}`);

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
      this.logger.warn(`Payment not found for transaction: ${transactionId}`);
      throw new NotFoundException('Payment not found');
    }

    // Skip if already processed
    if (payment.status !== PaymentStatus.PENDING) {
      this.logger.log(`Payment ${transactionId} already processed: ${payment.status}`);
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

    this.logger.log(`Processed payment by transaction ${transactionId}: ${success ? 'SUCCESS' : 'FAILED'}`);

    return this.paymentRepository.save(payment);
  }

  private async createEnrollmentForPayment(payment: Payment): Promise<void> {
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: {
        studentId: payment.studentId,
        courseId: payment.courseId,
      },
    });

    if (!existingEnrollment) {
      const enrollment = this.enrollmentRepository.create({
        studentId: payment.studentId,
        courseId: payment.courseId,
      });
      await this.enrollmentRepository.save(enrollment);
      this.logger.log(`Created enrollment for student ${payment.studentId} in course ${payment.courseId}`);
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
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async findByTransactionId(transactionId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { transactionId },
      relations: ['course', 'student'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
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

    const queryBuilder = this.paymentRepository.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.course', 'course')
      .leftJoinAndSelect('payment.student', 'student')
      .orderBy('payment.createdAt', 'DESC');

    if (options?.status) {
      queryBuilder.andWhere('payment.status = :status', { status: options.status });
    }

    if (options?.startDate) {
      queryBuilder.andWhere('payment.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('payment.createdAt <= :endDate', { endDate: options.endDate });
    }

    const [data, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    return { data, total, page, limit };
  }

  async getPaymentStats(): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    completedTransactions: number;
    pendingTransactions: number;
    failedTransactions: number;
    revenueByMonth: { month: string; revenue: number }[];
    revenueByMethod: { method: string; revenue: number }[];
  }> {
    const stats = await this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        'COUNT(*) as total',
        'SUM(CASE WHEN status = :completed THEN amount ELSE 0 END) as revenue',
        'SUM(CASE WHEN status = :completed THEN 1 ELSE 0 END) as completedCount',
        'SUM(CASE WHEN status = :pending THEN 1 ELSE 0 END) as pendingCount',
        'SUM(CASE WHEN status = :failed THEN 1 ELSE 0 END) as failedCount',
      ])
      .setParameters({
        completed: PaymentStatus.COMPLETED,
        pending: PaymentStatus.PENDING,
        failed: PaymentStatus.FAILED,
      })
      .getRawOne();

    // Revenue by month (last 12 months)
    const revenueByMonth = await this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        "TO_CHAR(payment.createdAt, 'YYYY-MM') as month",
        'SUM(amount) as revenue',
      ])
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.createdAt >= :startDate', {
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      })
      .groupBy("TO_CHAR(payment.createdAt, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany();

    // Revenue by payment method
    const revenueByMethod = await this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        'payment.paymentMethod as method',
        'SUM(amount) as revenue',
      ])
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('payment.paymentMethod')
      .getRawMany();

    return {
      totalRevenue: parseFloat(stats.revenue) || 0,
      totalTransactions: parseInt(stats.total) || 0,
      completedTransactions: parseInt(stats.completedcount) || 0,
      pendingTransactions: parseInt(stats.pendingcount) || 0,
      failedTransactions: parseInt(stats.failedcount) || 0,
      revenueByMonth: revenueByMonth.map((r) => ({
        month: r.month,
        revenue: parseFloat(r.revenue) || 0,
      })),
      revenueByMethod: revenueByMethod.map((r) => ({
        method: r.method,
        revenue: parseFloat(r.revenue) || 0,
      })),
    };
  }

  private generateTransactionId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `TXN-${timestamp}-${random}`;
  }
}
