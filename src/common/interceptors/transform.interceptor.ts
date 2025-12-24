import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already in the ApiResponse format, return it as is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Transform data to ApiResponse format
        const request = context.switchToHttp().getRequest();
        
        return {
          success: true,
          data,
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
