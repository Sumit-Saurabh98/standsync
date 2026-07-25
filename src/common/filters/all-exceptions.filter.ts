import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let error = 'Internal Server Error';
    let code = 'INTERNAL_ERROR';
    let message = 'Something went wrong.';
    let details: unknown[] = [];

    if (isHttp) {
      const res = exception.getResponse();
      error = exception.name;
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        if (typeof r.error === 'string') {
          error = r.error;
        }
        if (Array.isArray(r.message)) {
          code = 'VALIDATION_FAILED';
          message = 'Request validation failed.';
          details = r.message as unknown[];
        } else if (typeof r.message === 'string') {
          message = r.message;
        }
        if (typeof r.code === 'string') {
          code = r.code;
        }
      }
    }

    const requestId =
      (request.headers['x-request-id'] as string) ?? randomUUID();
    response.setHeader('x-request-id', requestId);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status} [${requestId}]`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} ${status} [${requestId}]`,
      );
    }

    response.status(status).json({
      statusCode: status,
      error,
      code,
      message,
      details,
      path: request.url,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
