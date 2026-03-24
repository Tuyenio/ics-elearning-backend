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

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = ERROR_CODES.INTERNAL_ERROR;
    let details: any = null;
    const language = getRequestLanguage(request);

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        errorCode = (exceptionResponse as any).errorCode || errorCode;
        details = (exceptionResponse as any).details || null;
      } else {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    const localizedMessage =
      typeof message === 'string' ? localizeMessage(message, language) : message;
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
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Message: ${localizedMessage}`,
    );

    response.status(status).json(errorResponse);
  }
}
