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

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const language = getRequestLanguage(request);

    return next.handle().pipe(
      map((data) => {
        // If data is already in the ApiResponse format, return it as is
        if (data && typeof data === 'object' && 'success' in data) {
          return localizePayloadMessages(data, language) as ApiResponse<T>;
        }

        // Transform data to ApiResponse format
        const localizedData = localizePayloadMessages(data, language);

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
