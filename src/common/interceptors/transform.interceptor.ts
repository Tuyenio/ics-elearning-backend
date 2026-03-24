import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';
import {
  getRequestLanguage,
  localizePayloadMessages,
} from '../i18n/message-localizer';
import { Request } from 'express';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  private isApiResponseShape(value: unknown): value is ApiResponse<unknown> {
    return typeof value === 'object' && value !== null && 'success' in value;
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const language = getRequestLanguage(request);

    return next.handle().pipe(
      map((data: unknown) => {
        // If data is already in the ApiResponse format, return it as is
        if (this.isApiResponseShape(data)) {
          return localizePayloadMessages(data, language) as ApiResponse<T>;
        }

        // Transform data to ApiResponse format
        const localizedData = localizePayloadMessages(data, language) as T;

        return {
          success: true,
          data: localizedData,
          meta: {
            timestamp: new Date(),
            path: request.url,
            method: request.method,
          },
        };
      }),
    );
  }
}
