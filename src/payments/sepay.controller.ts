import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { InstructorSubscriptionsService } from '../instructor-subscriptions/instructor-subscriptions.service';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';
import { PaymentsService } from './payments.service';

@Controller('sepay')
export class SepayController {
  private readonly logger = new Logger(SepayController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
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

    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)) {
      const parsed = Number(raw.replace(/\./g, '').replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : null;
    }

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

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: Record<string, unknown>) {
    this.logger.log(`SePay webhook (/sepay/webhook) payload keys: ${Object.keys(body || {}).join(', ')}`);

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
}
