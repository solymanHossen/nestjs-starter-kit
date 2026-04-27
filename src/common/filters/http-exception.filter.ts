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

    const exceptionResponse: any =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: (exception as Error).message || 'Internal server error' };

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: Array.isArray(exceptionResponse.message)
        ? exceptionResponse.message[0]
        : exceptionResponse.message || exceptionResponse || 'Something went wrong',
      error: exceptionResponse.error || (exception as any).name || 'Server Error',
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