import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface MomoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  endpoint: string;
  returnUrl: string;
  notifyUrl: string;
}

export interface CreatePaymentParams {
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  extraData?: string;
  requestType?: 'captureWallet' | 'payWithATM' | 'payWithCC' | 'payWithMethod';
  lang?: 'vi' | 'en';
}

export interface MomoPaymentResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  responseTime: number;
  message: string;
  resultCode: number;
  payUrl: string;
  deeplink?: string;
  qrCodeUrl?: string;
}

export interface MomoCallbackData {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: number;
  resultCode: number;
  message: string;
  payType: string;
  responseTime: number;
  extraData: string;
  signature: string;
}

export interface PaymentResult {
  success: boolean;
  code: number;
  message: string;
  data?: {
    orderId: string;
    requestId: string;
    amount: number;
    transId: number;
    payType: string;
  };
}

@Injectable()
export class MomoService {
  private readonly logger = new Logger(MomoService.name);
  private readonly config: MomoConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      partnerCode: this.configService.get<string>('MOMO_PARTNER_CODE', 'MOMO'),
      accessKey: this.configService.get<string>(
        'MOMO_ACCESS_KEY',
        'MOMO_ACCESS_KEY',
      ),
      secretKey: this.configService.get<string>(
        'MOMO_SECRET_KEY',
        'MOMO_SECRET_KEY',
      ),
      endpoint: this.configService.get<string>(
        'MOMO_ENDPOINT',
        'https://test-payment.momo.vn/v2/gateway/api',
      ),
      returnUrl: this.configService.get<string>(
        'MOMO_RETURN_URL',
        'http://localhost:3000/enrollment/success',
      ),
      notifyUrl: this.configService.get<string>(
        'MOMO_NOTIFY_URL',
        'http://localhost:5000/api/payments/momo/ipn',
      ),
    };
  }

  /**
   * Create Momo payment URL
   */
  async createPayment(
    params: CreatePaymentParams,
  ): Promise<MomoPaymentResponse> {
    const {
      orderId,
      requestId,
      amount,
      orderInfo,
      extraData = '',
      requestType = 'captureWallet',
      lang = 'vi',
    } = params;

    // Create signature
    const rawSignature = `accessKey=${this.config.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${this.config.notifyUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.config.partnerCode}&redirectUrl=${this.config.returnUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac('sha256', this.config.secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = {
      partnerCode: this.config.partnerCode,
      partnerName: 'ICS E-Learning',
      storeId: 'ICS_ELEARNING',
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: this.config.returnUrl,
      ipnUrl: this.config.notifyUrl,
      lang,
      requestType,
      autoCapture: true,
      extraData,
      signature,
    };

    try {
      const response = await fetch(`${this.config.endpoint}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = (await response.json()) as MomoPaymentResponse;

      if (result.resultCode === 0) {
        this.logger.log(`Created Momo payment for order: ${orderId}`);
        return result;
      }

      this.logger.warn(`Momo payment creation failed: ${result.message}`);
      throw new BadRequestException(result.message);
    } catch (error) {
      this.logger.error(`Error creating Momo payment:`, error);
      throw error;
    }
  }

  /**
   * Verify Momo callback/IPN signature
   */
  verifyCallback(callbackData: MomoCallbackData): PaymentResult {
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
    } = callbackData;

    // Verify signature
    const rawSignature = `accessKey=${this.config.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

    const expectedSignature = crypto
      .createHmac('sha256', this.config.secretKey)
      .update(rawSignature)
      .digest('hex');

    if (signature !== expectedSignature) {
      this.logger.warn(`Invalid Momo signature for order: ${orderId}`);
      return {
        success: false,
        code: -1,
        message: 'Chữ ký không hợp lệ',
      };
    }

    if (resultCode === 0) {
      this.logger.log(`Momo payment successful for order: ${orderId}`);
      return {
        success: true,
        code: resultCode,
        message: 'Thanh toán thành công',
        data: {
          orderId,
          requestId,
          amount,
          transId,
          payType,
        },
      };
    }

    this.logger.warn(
      `Momo payment failed for order: ${orderId}, code: ${resultCode}`,
    );
    return {
      success: false,
      code: resultCode,
      message: this.getErrorMessage(resultCode),
    };
  }

  /**
   * Query transaction status
   */
  async queryTransaction(orderId: string, requestId: string): Promise<any> {
    const rawSignature = `accessKey=${this.config.accessKey}&orderId=${orderId}&partnerCode=${this.config.partnerCode}&requestId=${requestId}`;

    const signature = crypto
      .createHmac('sha256', this.config.secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = {
      partnerCode: this.config.partnerCode,
      requestId,
      orderId,
      signature,
      lang: 'vi',
    };

    try {
      const response = await fetch(`${this.config.endpoint}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      return await response.json();
    } catch (error) {
      this.logger.error(`Error querying Momo transaction ${orderId}:`, error);
      throw new BadRequestException('Không thể truy vấn giao dịch');
    }
  }

  /**
   * Refund transaction
   */
  async refundTransaction(
    orderId: string,
    requestId: string,
    transId: number,
    amount: number,
    description: string,
  ): Promise<any> {
    const rawSignature = `accessKey=${this.config.accessKey}&amount=${amount}&description=${description}&orderId=${orderId}&partnerCode=${this.config.partnerCode}&requestId=${requestId}&transId=${transId}`;

    const signature = crypto
      .createHmac('sha256', this.config.secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = {
      partnerCode: this.config.partnerCode,
      orderId,
      requestId,
      amount,
      transId,
      lang: 'vi',
      description,
      signature,
    };

    try {
      const response = await fetch(`${this.config.endpoint}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      return await response.json();
    } catch (error) {
      this.logger.error(`Error refunding Momo transaction ${transId}:`, error);
      throw new BadRequestException('Không thể hoàn tiền giao dịch');
    }
  }

  /**
   * Confirm transaction (for delayed capture)
   */
  async confirmTransaction(
    orderId: string,
    requestId: string,
    amount: number,
    description: string,
  ): Promise<any> {
    const rawSignature = `accessKey=${this.config.accessKey}&amount=${amount}&description=${description}&orderId=${orderId}&partnerCode=${this.config.partnerCode}&requestId=${requestId}`;

    const signature = crypto
      .createHmac('sha256', this.config.secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = {
      partnerCode: this.config.partnerCode,
      orderId,
      requestId,
      amount,
      lang: 'vi',
      description,
      signature,
    };

    try {
      const response = await fetch(`${this.config.endpoint}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      return await response.json();
    } catch (error) {
      this.logger.error(`Error confirming Momo transaction ${orderId}:`, error);
      throw new BadRequestException('Không thể xác nhận giao dịch');
    }
  }

  /**
   * Get error message from Momo result code
   */
  private getErrorMessage(resultCode: number): string {
    const errorMessages: Record<number, string> = {
      0: 'Thành công',
      9000: 'Giao dịch đã được xác nhận thành công',
      8000: 'Giao dịch đang được xử lý',
      7000: 'Giao dịch đang được xử lý bởi nhà cung cấp',
      1000: 'Hệ thống đang bảo trì',
      1001: 'Không thể kết nối đến máy chủ thanh toán',
      1002: 'Giao dịch thất bại do lỗi từ nhà phát hành thẻ',
      1003: 'Giao dịch bị từ chối bởi nhà phát hành thẻ',
      1004: 'Giao dịch bị từ chối do thẻ quá hạn',
      1005: 'Giao dịch bị từ chối do thẻ không đủ hạn mức',
      1006: 'Giao dịch bị từ chối do nhập sai mã OTP',
      1007: 'Giao dịch bị từ chối do nhập sai thông tin thẻ',
      1017: 'Giao dịch bị từ chối do nhập sai checksum',
      1026: 'Giao dịch bị hạn chế theo thời gian',
      1080: 'Giao dịch hoàn tiền bị từ chối do vượt quá thời hạn',
      1081: 'Giao dịch hoàn tiền bị từ chối do giao dịch gốc không thành công',
      2019: 'Đơn hàng đã bị hủy hoặc thanh toán',
      4001: 'Giao dịch bị hủy bởi người dùng',
      4010: 'Giao dịch hết hạn',
      4011: 'Người dùng không đồng ý với điều khoản dịch vụ',
      4015: 'Giao dịch bị từ chối do thanh toán trùng lặp',
      4100: 'Giao dịch thất bại do người dùng không hoàn thành thanh toán',
      10: 'Hệ thống đang được bảo trì',
      11: 'Truy cập bị từ chối',
      12: 'Phiên bản API không được hỗ trợ',
      13: 'Xác thực merchant thất bại',
      20: 'Yêu cầu sai định dạng',
      21: 'Số tiền giao dịch không hợp lệ',
      22: 'Thông tin đơn hàng không hợp lệ',
      40: 'RequestId trùng lặp',
      41: 'OrderId trùng lặp',
      42: 'OrderId không hợp lệ hoặc không tìm thấy',
      43: 'Giao dịch xung đột với giao dịch đang xử lý',
      44: 'Giao dịch không thành công',
      45: 'Không thể hoàn tiền vì giao dịch gốc không hợp lệ',
      99: 'Lỗi không xác định',
    };

    return errorMessages[resultCode] || `Lỗi không xác định (${resultCode})`;
  }

  /**
   * Generate unique request ID
   */
  generateRequestId(): string {
    return `${this.config.partnerCode}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Generate unique order ID
   */
  generateOrderId(prefix: string = 'ORDER'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }
}
