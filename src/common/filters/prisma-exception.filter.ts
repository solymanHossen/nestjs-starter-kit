import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response, Request } from 'express';

interface ErrorShape {
  status: HttpStatus;
  message: string;
  errorCode: string;
}

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, errorCode } = this.resolveError(exception);

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error: errorCode,
    };

    this.logger.warn(
      `[${request.method}] ${request.url} → ${status} | Prisma ${exception.code} | ${message}`,
    );

    response.status(status).json(errorResponse);
  }

  private resolveError(exception: Prisma.PrismaClientKnownRequestError): ErrorShape {
    switch (exception.code) {
      case 'P2002': {
        const target = Array.isArray(exception.meta?.['target'])
          ? (exception.meta['target'] as string[]).join(', ')
          : 'field';
        return {
          status: HttpStatus.CONFLICT,
          message: `A record with this ${target} already exists.`,
          errorCode: 'UNIQUE_CONSTRAINT_VIOLATION',
        };
      }

      case 'P2003': {
        const field = String(exception.meta?.['field_name'] ?? 'related record');
        return {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          message: `Foreign key constraint failed on field: ${field}.`,
          errorCode: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
        };
      }

      case 'P2014': {
        return {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          message: 'The change violates a required relation between records.',
          errorCode: 'REQUIRED_RELATION_VIOLATION',
        };
      }

      case 'P2025': {
        const cause = exception.meta?.['cause'];
        return {
          status: HttpStatus.NOT_FOUND,
          message: typeof cause === 'string' ? cause : 'Record not found.',
          errorCode: 'RECORD_NOT_FOUND',
        };
      }

      case 'P2024': {
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database connection pool timed out. Please retry your request.',
          errorCode: 'CONNECTION_POOL_TIMEOUT',
        };
      }

      default: {
        this.logger.error(
          `Unhandled Prisma error code ${exception.code}`,
          exception.stack,
        );
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'A database error occurred. Please try again later.',
          errorCode: 'DATABASE_ERROR',
        };
      }
    }
  }
}
