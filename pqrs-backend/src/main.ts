import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, HttpStatus } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';
import { SanitizeResponseInterceptor } from './common/interceptors/sanitize-response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Asegurar la existencia de la carpeta uploads/pqrs
  const uploadsDir = join(__dirname, '..', 'uploads');
  const pqrsUploadsDir = join(uploadsDir, 'pqrs');
  if (!fs.existsSync(pqrsUploadsDir)) {
    fs.mkdirSync(pqrsUploadsDir, { recursive: true });
  }

  // Servir archivos estáticos desde /uploads
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // Prefijo global de API
  app.setGlobalPrefix('api');

  // Cookie parser — necesario para leer refreshToken de cookie HttpOnly
  app.use(cookieParser());

  // Cabeceras de seguridad HTTP
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
          scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
        },
      },
    }),
  );

  // CORS restringido al frontend — credentials:true para enviar cookies
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:4200',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Validación global de DTOs — 422 para errores de validación
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );

  // Filtros de excepción globales
  app.useGlobalFilters(new HttpExceptionFilter(), new ValidationExceptionFilter());

  // Interceptor que elimina campos sensibles de todas las respuestas
  app.useGlobalInterceptors(new SanitizeResponseInterceptor());

  // Documentación Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('PQRS API')
    .setDescription('API de PQRS con autenticación JWT y control de acceso por roles')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Backend running on: http://localhost:${port}/api`);
  console.log(`Swagger Docs: http://localhost:${port}/api/docs`);
}
bootstrap();
