import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  private cache = new Map<string, any>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const key = `${request.method}_${request.url}`;

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Check cache
    const cachedResponse = this.cache.get(key);
    if (cachedResponse) {
      const { data, timestamp } = cachedResponse;
      const age = Date.now() - timestamp;

      // Return cached data if still valid
      if (age < this.TTL) {
        return of(data);
      }

      // Remove stale cache
      this.cache.delete(key);
    }

    // Cache miss - fetch and store
    return next.handle().pipe(
      tap((data) => {
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
        });
      }),
    );
  }
}
