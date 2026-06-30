import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const { message, errors } = this.resolveMessage(exception, status);

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(errors.length > 1 && { errors }),
    };

    const logLine = `[${request.method}] ${request.url} → ${status} | ${message}`;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(logLine, exception instanceof Error ? exception.stack : String(exception));
    } else {
      this.logger.warn(logLine);
    }

    response.status(status).json(errorResponse);
  }

  private resolveMessage(
    exception: unknown,
    status: number,
  ): { message: string; errors: string[] } {
    if (exception instanceof HttpException) {
      const raw = exception.getResponse();

      if (typeof raw === 'string') {
        return { message: raw, errors: [] };
      }

      if (typeof raw === 'object' && raw !== null) {
        const obj = raw as Record<string, unknown>;
        const msgField = obj['message'];

        if (Array.isArray(msgField)) {
          const errors = msgField.map((m) => String(m));
          return { message: errors[0] ?? 'Validation failed', errors };
        }

        return {
          message: typeof msgField === 'string' ? msgField : 'Request failed',
          errors: [],
        };
      }
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return { message: 'An unexpected error occurred. Please try again later.', errors: [] };
    }

    return {
      message: exception instanceof Error ? exception.message : 'Request failed',
      errors: [],
    };
  }
}
