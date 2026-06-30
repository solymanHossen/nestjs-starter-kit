import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  timestamp: string;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    const httpResponse = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((res: unknown) => {
        const body = res as Record<string, unknown> | null | undefined;
        return {
          success: true as const,
          statusCode: httpResponse.statusCode,
          timestamp: new Date().toISOString(),
          message: typeof body?.message === 'string' ? body.message : 'Success',
          data: (body?.data !== undefined ? body.data : res) as T,
        };
      }),
    );
  }
}
