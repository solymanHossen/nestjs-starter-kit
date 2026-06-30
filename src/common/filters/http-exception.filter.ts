import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

export interface ErrorResponseShape {
  success: false;
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  errors: string[];
  data: null;
}

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

    const errorResponse: ErrorResponseShape = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      errors,
      data: null,
    };

    const logLine = `[${request.method}] ${request.url} → ${status} | ${message}`;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        logLine,
        exception instanceof Error ? exception.stack : String(exception),
      );
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
          return {
            // First error surfaced as the primary message; full list in errors[].
            message: errors[0] ?? 'Validation failed',
            errors,
          };
        }

        return {
          message: typeof msgField === 'string' ? msgField : 'Request failed',
          errors: [],
        };
      }
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return {
        message: 'An unexpected error occurred. Please try again later.',
        errors: [],
      };
    }

    // For non-5xx, non-HttpException errors: surface the message only when it is
    // safe to do so (i.e. the status code indicates a client error, not a server fault).
    return {
      message: exception instanceof Error ? exception.message : 'Request failed',
      errors: [],
    };
  }
}
