import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GLOBAL_ERROR_HANDLER');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Something went wrong';
    let errorName = 'Server Error';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        if (Array.isArray(responseObj.message)) {
          message = (responseObj.message[0] as string) || 'Validation failed';
        } else if (typeof responseObj.message === 'string') {
          message = responseObj.message;
        } else {
          message = JSON.stringify(exceptionResponse);
        }

        if (typeof responseObj.error === 'string') {
          errorName = responseObj.error;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message || 'Internal server error';
      errorName = exception.name || 'Error';
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error: errorName,
    };

    this.logger.error(
      `[${request.method}] ${request.url} | Status: ${status} | Message: ${JSON.stringify(errorResponse.message)}`,
    );

    if (process.env.NODE_ENV !== 'production' && status === 500) {
      console.error('Full Error Stack:', exception);
    }

    response.status(status).json(errorResponse);
  }
}