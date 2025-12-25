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
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';
import { VNPayService } from './vnpay.service';
import type { VNPayReturnData } from './vnpay.service';
import { MomoService } from './momo.service';
import type { MomoCallbackData } from './momo.service';

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

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly vnpayService: VNPayService,
    private readonly momoService: MomoService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  create(@Body() createPaymentDto: CreatePaymentDto, @GetUser() user: User) {
    return this.paymentsService.create(createPaymentDto, user);
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
    @Body() filters: any,
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
    @Req() req: any,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.paymentsService.generateInvoice(id, req.user.userId);
    
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
  async createVNPayPayment(
    @Body() body: CreateVNPayPaymentDto,
    @GetUser() user: User,
    @Req() req: Request,
  ) {
    const orderId = `VNPAY_${user.id}_${Date.now()}`;
    const ipAddr = req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1';

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
        paymentMethod: 'vnpay',
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
        paymentMethod: 'momo',
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
  async momoReturn(@Query() query: any, @Res() res: Response) {
    const resultCode = parseInt(query.resultCode);

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
