import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response, Request } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('PRISMA_ERROR_HANDLER');

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'DB_ERROR';

    // Prisma specific error codes handling
    switch (exception.code) {
      case 'P2002': // Unique constraint failed
        status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[]) || ['field'];
        message = `${target.join(', ')} already exists.`;
        errorCode = 'UNIQUE_CONSTRAINT_VIOLATION';
        break;
      case 'P2025': // Record not found
        status = HttpStatus.NOT_FOUND;
        message = (exception.meta?.cause as string) || 'Record not found.';
        errorCode = 'RECORD_NOT_FOUND';
        break;
      default:
        message = exception.message || 'Database transaction failed.';
        break;
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error: errorCode,
    };

    this.logger.error(
      `[${request.method}] ${request.url} | Prisma Code: ${exception.code} | Status: ${status} | Message: ${message}`,
    );

    response.status(status).json(errorResponse);
  }
}