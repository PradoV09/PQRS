import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Handle Multer errors
    if (exception instanceof MulterError) {
      let message = 'Error al subir archivo';
      
      switch (exception.code) {
        case 'LIMIT_FILE_SIZE':
          message = 'El archivo supera el límite de 10 MB';
          break;
        case 'LIMIT_FILE_COUNT':
          message = 'Máximo 5 archivos permitidos';
          break;
        case 'LIMIT_UNEXPECTED_FILE':
          message = 'Campo de archivo inesperado';
          break;
        default:
          message = exception.message || 'Error al subir archivo';
      }

      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        error: 'Bad Request',
      });
      return;
    }

    // Handle NestJS HTTP exceptions
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      response.status(status).json(exceptionResponse);
      return;
    }

    // Handle unknown errors
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
      error: 'Internal Server Error',
    });
  }
}
