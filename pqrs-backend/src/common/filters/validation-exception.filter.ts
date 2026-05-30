import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(UnprocessableEntityException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: UnprocessableEntityException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const body = exception.getResponse() as { message: string | string[] };

    const mensajes = Array.isArray(body.message) ? body.message : [body.message];

    response.status(422).json({
      statusCode: 422,
      error: 'Validation Error',
      mensajes,
      timestamp: new Date().toISOString(),
    });
  }
}
