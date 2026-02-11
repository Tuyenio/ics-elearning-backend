import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as querystring from 'qs';

export interface VNPayConfig {
  tmnCode: string;
  hashSecret: string;
  vnpUrl: string;
  returnUrl: string;
  apiUrl?: string;
}

export interface CreatePaymentParams {
  orderId: string;
  amount: number; // in VND
  orderInfo: string;
  orderType?: string;
  locale?: 'vn' | 'en';
  bankCode?: string;
  ipAddr: string;
}

export interface VNPayReturnData {
  vnp_TmnCode: string;
  vnp_Amount: string;
  vnp_BankCode: string;
  vnp_BankTranNo?: string;
  vnp_CardType?: string;
  vnp_PayDate: string;
  vnp_OrderInfo: string;
  vnp_TransactionNo: string;
  vnp_ResponseCode: string;
  vnp_TransactionStatus: string;
  vnp_TxnRef: string;
  vnp_SecureHash: string;
  vnp_SecureHashType?: string;
}

export interface PaymentResult {
  success: boolean;
  code: string;
  message: string;
  data?: {
    orderId: string;
    amount: number;
    bankCode: string;
    transactionNo: string;
    payDate: string;
  };
}

@Injectable()
export class VNPayService {
  private readonly logger = new Logger(VNPayService.name);
  private readonly config: VNPayConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      tmnCode: this.configService.get<string>('VNPAY_TMN_CODE', 'DEMO'),
      hashSecret: this.configService.get<string>(
        'VNPAY_HASH_SECRET',
        'VNPAY_HASH_SECRET_KEY',
      ),
      vnpUrl: this.configService.get<string>(
        'VNPAY_URL',
        'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      ),
      returnUrl: this.configService.get<string>(
        'VNPAY_RETURN_URL',
        'http://localhost:3000/enrollment/success',
      ),
      apiUrl: this.configService.get<string>(
        'VNPAY_API_URL',
        'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
      ),
    };
  }

  /**
   * Create VNPay payment URL
   */
  createPaymentUrl(params: CreatePaymentParams): string {
    const date = new Date();
    const createDate = this.formatDate(date);
    const expireDate = this.formatDate(
      new Date(date.getTime() + 15 * 60 * 1000),
    ); // 15 minutes expire

    let vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.config.tmnCode,
      vnp_Locale: params.locale || 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: params.orderId,
      vnp_OrderInfo: params.orderInfo,
      vnp_OrderType: params.orderType || 'other',
      vnp_Amount: (params.amount * 100).toString(), // VNPay requires amount in smallest unit
      vnp_ReturnUrl: this.config.returnUrl,
      vnp_IpAddr: params.ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    if (params.bankCode) {
      vnpParams['vnp_BankCode'] = params.bankCode;
    }

    // Sort params
    vnpParams = this.sortObject(vnpParams);

    // Create signature
    const signData = querystring.stringify(vnpParams, { encode: false });
    const hmac = crypto.createHmac('sha512', this.config.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    vnpParams['vnp_SecureHash'] = signed;

    const paymentUrl = `${this.config.vnpUrl}?${querystring.stringify(vnpParams, { encode: false })}`;

    this.logger.log(`Created VNPay payment URL for order: ${params.orderId}`);

    return paymentUrl;
  }

  /**
   * Verify VNPay return data
   */
  verifyReturnUrl(vnpParams: VNPayReturnData): PaymentResult {
    const secureHash = vnpParams.vnp_SecureHash;

    // Remove hash params for verification - create new object without these properties
    const { vnp_SecureHash, vnp_SecureHashType, ...verifyParams } = vnpParams;

    // Sort and create signature
    const sortedParams = this.sortObject(
      verifyParams as Record<string, string>,
    );
    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', this.config.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash !== signed) {
      this.logger.warn(`Invalid signature for order: ${vnpParams.vnp_TxnRef}`);
      return {
        success: false,
        code: '97',
        message: 'Chữ ký không hợp lệ',
      };
    }

    const responseCode = vnpParams.vnp_ResponseCode;
    const transactionStatus = vnpParams.vnp_TransactionStatus;

    if (responseCode === '00' && transactionStatus === '00') {
      this.logger.log(`Payment successful for order: ${vnpParams.vnp_TxnRef}`);
      return {
        success: true,
        code: '00',
        message: 'Payment successful',
        data: {
          orderId: vnpParams.vnp_TxnRef,
          amount: parseInt(vnpParams.vnp_Amount) / 100,
          bankCode: vnpParams.vnp_BankCode,
          transactionNo: vnpParams.vnp_TransactionNo,
          payDate: vnpParams.vnp_PayDate,
        },
      };
    }

    const errorMessage = this.getResponseMessage(responseCode);
    this.logger.warn(
      `Payment failed for order: ${vnpParams.vnp_TxnRef}, code: ${responseCode}`,
    );

    return {
      success: false,
      code: responseCode,
      message: errorMessage,
    };
  }

  /**
   * Verify IPN (Instant Payment Notification) from VNPay
   */
  verifyIpn(vnpParams: VNPayReturnData): { rspCode: string; message: string } {
    const result = this.verifyReturnUrl(vnpParams);

    if (!result.success && result.code === '97') {
      return { rspCode: '97', message: 'Chữ ký không hợp lệ' };
    }

    // Here you would typically:
    // 1. Check if orderId exists in your database
    // 2. Check if amount matches
    // 3. Check if order status is pending
    // 4. Update order status

    if (result.success) {
      return { rspCode: '00', message: 'Xác nhận thành công' };
    }

    return { rspCode: result.code, message: result.message };
  }

  /**
   * Query transaction status
   */
  async queryTransaction(
    orderId: string,
    transDate: string,
    ipAddr: string,
  ): Promise<any> {
    const date = new Date();
    const requestId =
      this.formatDate(date) + Math.random().toString(36).substring(2, 8);

    const data: Record<string, string> = {
      vnp_RequestId: requestId,
      vnp_Version: '2.1.0',
      vnp_Command: 'querydr',
      vnp_TmnCode: this.config.tmnCode,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Query transaction ${orderId}`,
      vnp_TransDate: transDate,
      vnp_CreateDate: this.formatDate(date),
      vnp_IpAddr: ipAddr,
    };

    // Create signature
    const signData = `${data.vnp_RequestId}|${data.vnp_Version}|${data.vnp_Command}|${data.vnp_TmnCode}|${data.vnp_TxnRef}|${data.vnp_TransDate}|${data.vnp_CreateDate}|${data.vnp_IpAddr}|${data.vnp_OrderInfo}`;
    const hmac = crypto.createHmac('sha512', this.config.hashSecret);
    data.vnp_SecureHash = hmac
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    try {
      const response = await fetch(this.config.apiUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      return await response.json();
    } catch (error) {
      this.logger.error(`Error querying transaction ${orderId}:`, error);
      throw new BadRequestException('Không thể truy vấn giao dịch');
    }
  }

  /**
   * Refund transaction
   */
  async refundTransaction(
    orderId: string,
    transDate: string,
    amount: number,
    transType: '02' | '03', // 02: full refund, 03: partial refund
    ipAddr: string,
    user: string,
  ): Promise<any> {
    const date = new Date();
    const requestId =
      this.formatDate(date) + Math.random().toString(36).substring(2, 8);

    const data: Record<string, string> = {
      vnp_RequestId: requestId,
      vnp_Version: '2.1.0',
      vnp_Command: 'refund',
      vnp_TmnCode: this.config.tmnCode,
      vnp_TransactionType: transType,
      vnp_TxnRef: orderId,
      vnp_Amount: (amount * 100).toString(),
      vnp_OrderInfo: `Refund for order ${orderId}`,
      vnp_TransDate: transDate,
      vnp_CreateBy: user,
      vnp_CreateDate: this.formatDate(date),
      vnp_IpAddr: ipAddr,
    };

    // Create signature
    const signData = `${data.vnp_RequestId}|${data.vnp_Version}|${data.vnp_Command}|${data.vnp_TmnCode}|${data.vnp_TransactionType}|${data.vnp_TxnRef}|${data.vnp_Amount}|${data.vnp_TransDate}|${data.vnp_CreateBy}|${data.vnp_CreateDate}|${data.vnp_IpAddr}|${data.vnp_OrderInfo}`;
    const hmac = crypto.createHmac('sha512', this.config.hashSecret);
    data.vnp_SecureHash = hmac
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    try {
      const response = await fetch(this.config.apiUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      return await response.json();
    } catch (error) {
      this.logger.error(`Error refunding transaction ${orderId}:`, error);
      throw new BadRequestException('Không thể hoàn tiền giao dịch');
    }
  }

  /**
   * Format date for VNPay (yyyyMMddHHmmss)
   */
  private formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');

    return (
      date.getFullYear().toString() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds())
    );
  }

  /**
   * Sort object by keys alphabetically
   */
  private sortObject(obj: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
    }

    return sorted;
  }

  /**
   * Get response message from VNPay response code
   */
  private getResponseMessage(code: string): string {
    const messages: Record<string, string> = {
      '00': 'Giao dịch thành công',
      '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
      '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
      '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
      '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
      '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
      '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin quý khách vui lòng thực hiện lại giao dịch.',
      '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
      '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
      '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
      '75': 'Ngân hàng thanh toán đang bảo trì.',
      '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định. Xin quý khách vui lòng thực hiện lại giao dịch',
      '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)',
    };

    return messages[code] || `Lỗi không xác định (${code})`;
  }

  /**
   * Get list of supported banks
   */
  getSupportedBanks(): { code: string; name: string; logo?: string }[] {
    return [
      { code: 'NCB', name: 'Ngân hàng NCB' },
      { code: 'AGRIBANK', name: 'Ngân hàng Agribank' },
      { code: 'SCB', name: 'Ngân hàng SCB' },
      { code: 'SACOMBANK', name: 'Ngân hàng SacomBank' },
      { code: 'EXIMBANK', name: 'Ngân hàng EximBank' },
      { code: 'MSBANK', name: 'Ngân hàng MSBANK' },
      { code: 'NAMABANK', name: 'Ngân hàng NamABank' },
      { code: 'VNMART', name: 'Ví điện tử VnMart' },
      { code: 'VIETINBANK', name: 'Ngân hàng Vietinbank' },
      { code: 'VIETCOMBANK', name: 'Ngân hàng VCB' },
      { code: 'HDBANK', name: 'Ngân hàng HDBank' },
      { code: 'DONGABANK', name: 'Ngân hàng Đông Á' },
      { code: 'TPBANK', name: 'Ngân hàng TPBank' },
      { code: 'OJB', name: 'Ngân hàng OceanBank' },
      { code: 'BIDV', name: 'Ngân hàng BIDV' },
      { code: 'TECHCOMBANK', name: 'Ngân hàng Techcombank' },
      { code: 'VPBANK', name: 'Ngân hàng VPBank' },
      { code: 'MBBANK', name: 'Ngân hàng MBBank' },
      { code: 'ACB', name: 'Ngân hàng ACB' },
      { code: 'OCB', name: 'Ngân hàng OCB' },
      { code: 'IVB', name: 'Ngân hàng IVB' },
      { code: 'VISA', name: 'Thẻ quốc tế VISA' },
      { code: 'MASTERCARD', name: 'Thẻ quốc tế MasterCard' },
      { code: 'JCB', name: 'Thẻ quốc tế JCB' },
      { code: 'UPI', name: 'Thẻ quốc tế UnionPay' },
    ];
  }
}
