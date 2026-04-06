import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateSepayCoursePaymentDto } from './dto/create-sepay-course-payment.dto';
import { CreateWalletTopupDto } from './dto/create-wallet-topup.dto';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';
import { PaymentMethod } from './entities/payment.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';
import { VNPayService } from './vnpay.service';
import type { VNPayReturnData } from './vnpay.service';
import { MomoService } from './momo.service';
import type { MomoCallbackData } from './momo.service';
import type { AuthenticatedRequestUser } from '../common/types/authenticated-request';
import { InstructorSubscriptionsService } from '../instructor-subscriptions/instructor-subscriptions.service';

// DTOs for payment requests
class CreateVNPayPaymentDto {
  courseId: string;
  amount: number;
  orderInfo?: string;
  bankCode?: string;
  locale?: 'vn' | 'en';
}

class CreateMomoPaymentDto {
  courseId: string;
  amount: number;
  orderInfo?: string;
}

type MomoReturnQuery = {
  resultCode: string;
  orderId: string;
  message?: string;
};

type PaymentExportFilters = {
  page?: number;
  limit?: number;
  status?: string;
  userId?: string;
  courseId?: string;
  teacherId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
};

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly vnpayService: VNPayService,
    private readonly momoService: MomoService,
    private readonly instructorSubscriptionsService: InstructorSubscriptionsService,
  ) {}

  private parseTransferType(value: unknown): 'in' | 'out' | null {
    const raw = String(value || '')
      .trim()
      .toLowerCase();

    if (!raw) {
      return null;
    }

    if (['in', 'incoming', 'credit', 'inbound', '+'].includes(raw)) {
      return 'in';
    }

    if (['out', 'outgoing', 'debit', 'outbound', '-'].includes(raw)) {
      return 'out';
    }

    return null;
  }

  private parseTransferAmount(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value !== 'string') {
      return null;
    }

    const raw = value.trim();
    if (!raw) {
      return null;
    }

    // 1.234.567,89
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)) {
      const parsed = Number(raw.replace(/\./g, '').replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : null;
    }

    // 1,234,567.89
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw)) {
      const parsed = Number(raw.replace(/,/g, ''));
      return Number.isFinite(parsed) ? parsed : null;
    }

    const normalized = raw.includes(',') && !raw.includes('.')
      ? raw.replace(',', '.')
      : raw;

    const cleaned = normalized.replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeWebhookPayload(payload: Record<string, unknown>): SepayWebhookDto {
    const transferType = this.parseTransferType(
      payload.transferType ??
        payload.transfer_type ??
        payload.type ??
        payload.transactionType,
    );

    const transferAmount = this.parseTransferAmount(
      payload.transferAmount ??
        payload.transfer_amount ??
        payload.amount ??
        payload.transactionAmount,
    );

    if (!transferType || transferAmount === null) {
      throw new BadRequestException({
        message: 'Invalid SePay webhook payload',
        payloadKeys: Object.keys(payload),
      });
    }

    return {
      id: payload.id ? String(payload.id) : undefined,
      transferType,
      transferAmount,
      content:
        payload.content || payload.description || payload.transfer_content
          ? String(
              payload.content ||
                payload.description ||
                payload.transfer_content,
            )
          : undefined,
      transactionDate:
        payload.transactionDate || payload.transaction_date
          ? String(payload.transactionDate || payload.transaction_date)
          : undefined,
      accountNumber:
        payload.accountNumber || payload.account_number
          ? String(payload.accountNumber || payload.account_number)
          : undefined,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Throttle({ short: { limit: 10, ttl: 300000 } }) // 10 payments per 5 minutes
  create(@Body() createPaymentDto: CreatePaymentDto, @GetUser() user: User) {
    return this.paymentsService.create(createPaymentDto, user);
  }

  @Post('sepay/course')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Throttle({ short: { limit: 10, ttl: 300000 } })
  createSepayCoursePayment(
    @Body() body: CreateSepayCoursePaymentDto,
    @GetUser() user: User,
  ) {
    return this.paymentsService.createSepayCoursePayment(body, user);
  }

  @Post('course/wallet')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Throttle({ short: { limit: 20, ttl: 300000 } })
  payCourseByWallet(
    @Body() body: CreateSepayCoursePaymentDto,
    @GetUser() user: User,
  ) {
    return this.paymentsService.payCourseByWallet(body, user);
  }

  @Post('wallet-topups/sepay')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.TEACHER)
  @Throttle({ short: { limit: 10, ttl: 300000 } })
  createWalletTopup(
    @Body() body: CreateWalletTopupDto,
    @GetUser() user: User,
  ) {
    return this.paymentsService.createWalletTopupSepay(body, user);
  }

  @Get('sepay/status/:transactionCode')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.TEACHER)
  getSepayStatus(
    @Param('transactionCode') transactionCode: string,
    @GetUser() user: User,
  ) {
    return this.paymentsService.getSepayPaymentStatus(transactionCode, user.id);
  }

  @Post('sepay/webhook')
  @HttpCode(HttpStatus.OK)
  async handleSepayWebhook(@Body() body: Record<string, unknown>) {
    this.logger.log(`SePay webhook payload keys: ${Object.keys(body || {}).join(', ')}`);
    const normalizedBody = this.normalizeWebhookPayload(body || {});

    const studentResult =
      await this.paymentsService.handleSepayWebhook(normalizedBody);
    const instructorResult =
      await this.instructorSubscriptionsService.handleSepayWebhook(
        normalizedBody,
      );

    if (studentResult.success || instructorResult.success) {
      return {
        success: true,
        studentResult,
        instructorResult,
      };
    }

    return {
      success: false,
      studentResult,
      instructorResult,
    };
  }

  @Patch(':id/process')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  processPayment(
    @Param('id') id: string,
    @Body() body: { success: boolean; reason?: string },
  ) {
    return this.paymentsService.processPayment(id, body.success, body.reason);
  }

  @Get('my-payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  findMyPayments(@GetUser() user: User) {
    return this.paymentsService.findByStudent(user.id);
  }

  // Admin endpoints
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAllAdmin(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('courseId') courseId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    return this.paymentsService.findAllWithFilters({
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 20,
      status,
      userId,
      courseId,
      teacherId,
      startDate,
      endDate,
      search,
    });
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getPaymentStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.paymentsService.getPaymentStats(startDate, endDate);
  }

  @Post('admin/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async exportPayments(
    @Body() filters: PaymentExportFilters,
    @Res() res: Response,
  ) {
    const csv = await this.paymentsService.exportToCSV(filters);
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="payments.csv"');
    res.send(csv);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Get(':id/invoice')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  async generateInvoice(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedRequestUser,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.paymentsService.generateInvoice(id, user.id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  @Get('transaction/:transactionId')
  @UseGuards(JwtAuthGuard)
  findByTransactionId(@Param('transactionId') transactionId: string) {
    return this.paymentsService.findByTransactionId(transactionId);
  }

  // ================== VNPay Integration ==================

  /**
   * Create VNPay payment URL
   */
  @Post('vnpay/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Throttle({ short: { limit: 5, ttl: 300000 } }) // 5 VNPay payments per 5 minutes
  async createVNPayPayment(
    @Body() body: CreateVNPayPaymentDto,
    @GetUser() user: User,
    @Req() req: Request,
  ) {
    const orderId = `VNPAY_${user.id}_${Date.now()}`;
    const ipAddr =
      req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1';

    const paymentUrl = this.vnpayService.createPaymentUrl({
      orderId,
      amount: body.amount,
      orderInfo: body.orderInfo || `Thanh toán khóa học #${body.courseId}`,
      bankCode: body.bankCode,
      locale: body.locale,
      ipAddr,
    });

    // Create pending payment record
    await this.paymentsService.create(
      {
        courseId: body.courseId,
        amount: body.amount,
        paymentMethod: PaymentMethod.VNPAY,
        transactionId: orderId,
      },
      user,
    );

    return {
      success: true,
      paymentUrl,
      orderId,
    };
  }

  /**
   * VNPay return URL handler
   */
  @Get('vnpay/return')
  async vnpayReturn(@Query() query: VNPayReturnData, @Res() res: Response) {
    const result = this.vnpayService.verifyReturnUrl(query);

    if (result.success && result.data) {
      // Update payment status
      await this.paymentsService.processPaymentByTransactionId(
        result.data.orderId,
        true,
        result.data.transactionNo,
      );

      // Redirect to success page
      return res.redirect(
        `/enrollment/success?orderId=${result.data.orderId}&status=success`,
      );
    }

    // Redirect to failure page
    return res.redirect(
      `/enrollment/success?orderId=${query.vnp_TxnRef}&status=failed&message=${encodeURIComponent(result.message)}`,
    );
  }

  /**
   * VNPay IPN (Instant Payment Notification) handler
   */
  @Get('vnpay/ipn')
  @HttpCode(HttpStatus.OK)
  async vnpayIpn(@Query() query: VNPayReturnData) {
    const result = this.vnpayService.verifyReturnUrl(query);

    if (result.success && result.data) {
      await this.paymentsService.processPaymentByTransactionId(
        result.data.orderId,
        true,
        result.data.transactionNo,
      );
      return { RspCode: '00', Message: 'Xác nhận thành công' };
    }

    return { RspCode: result.code, Message: result.message };
  }

  /**
   * Get VNPay supported banks
   */
  @Get('vnpay/banks')
  getVNPayBanks() {
    return this.vnpayService.getSupportedBanks();
  }

  // ================== Momo Integration ==================

  /**
   * Create Momo payment
   */
  @Post('momo/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Throttle({ short: { limit: 5, ttl: 300000 } }) // 5 Momo payments per 5 minutes
  async createMomoPayment(
    @Body() body: CreateMomoPaymentDto,
    @GetUser() user: User,
  ) {
    const orderId = this.momoService.generateOrderId('MOMO');
    const requestId = this.momoService.generateRequestId();

    const result = await this.momoService.createPayment({
      orderId,
      requestId,
      amount: body.amount,
      orderInfo: body.orderInfo || `Thanh toán khóa học #${body.courseId}`,
    });

    // Create pending payment record
    await this.paymentsService.create(
      {
        courseId: body.courseId,
        amount: body.amount,
        paymentMethod: PaymentMethod.MOMO,
        transactionId: orderId,
      },
      user,
    );

    return {
      success: true,
      payUrl: result.payUrl,
      deeplink: result.deeplink,
      qrCodeUrl: result.qrCodeUrl,
      orderId,
    };
  }

  /**
   * Momo IPN handler
   */
  @Post('momo/ipn')
  @HttpCode(HttpStatus.OK)
  async momoIpn(@Body() body: MomoCallbackData) {
    const result = this.momoService.verifyCallback(body);

    if (result.success && result.data) {
      await this.paymentsService.processPaymentByTransactionId(
        result.data.orderId,
        true,
        result.data.transId.toString(),
      );
    }

    return { status: result.success ? 0 : -1 };
  }

  /**
   * Momo return URL handler
   */
  @Get('momo/return')
  momoReturn(@Query() query: MomoReturnQuery, @Res() res: Response) {
    const resultCode = parseInt(query.resultCode, 10);

    if (resultCode === 0) {
      return res.redirect(
        `/enrollment/success?orderId=${query.orderId}&status=success`,
      );
    }

    return res.redirect(
      `/enrollment/success?orderId=${query.orderId}&status=failed&message=${encodeURIComponent(query.message || 'Payment failed')}`,
    );
  }
}
