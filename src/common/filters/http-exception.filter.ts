import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ERROR_CODES } from '../constants/app.constants';
import {
  getRequestLanguage,
  localizeMessage,
  localizePayloadMessages,
} from '../i18n/message-localizer';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  private isLocalizedResponse(
    payload: unknown,
  ): payload is { message?: unknown; errorCode?: unknown; details?: unknown } {
    return typeof payload === 'object' && payload !== null;
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorCode: string = ERROR_CODES.INTERNAL_ERROR;
    let details: unknown = null;
    const language = getRequestLanguage(request);

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (this.isLocalizedResponse(exceptionResponse)) {
        const {
          message: responseMessage,
          errorCode: responseCode,
          details: responseDetails,
        } = exceptionResponse;

        if (
          typeof responseMessage === 'string' ||
          Array.isArray(responseMessage)
        ) {
          message = responseMessage;
        }

        if (typeof responseCode === 'string') {
          errorCode = responseCode;
        }

        if (responseDetails !== undefined) {
          details = responseDetails ?? null;
        }
      } else {
        message =
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : 'Internal server error';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    const localizedMessage =
      typeof message === 'string'
        ? localizeMessage(message, language)
        : message;
    const localizedDetails = localizePayloadMessages(details, language);

    const errorResponse = {
      success: false,
      error: {
        code: errorCode,
        message: localizedMessage,
        details: localizedDetails,
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      },
    };

    // Log error for debugging
    const messageForLog = Array.isArray(localizedMessage)
      ? localizedMessage.join('; ')
      : localizedMessage;
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Message: ${messageForLog}`,
    );

    response.status(status).json(errorResponse);
  }
}
