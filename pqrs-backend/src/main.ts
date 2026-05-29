import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Asegurar la existencia de la carpeta uploads/pqrs
  const uploadsDir = join(__dirname, '..', 'uploads');
  const pqrsUploadsDir = join(uploadsDir, 'pqrs');
  if (!fs.existsSync(pqrsUploadsDir)) {
    fs.mkdirSync(pqrsUploadsDir, { recursive: true });
  }

  // Servir archivos estáticos desde /uploads
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads',
  });

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Use Helmet for security headers (configured to allow inline Swagger scripts)
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

  // Configure CORS restricted to the frontend origin with credentials
  app.enableCors({
    origin: 'http://localhost:4200',
    credentials: true,
  });

  // Global Validation Pipe with strict whitelisting and auto-transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global Exception Filter for Multer errors and other HTTP exceptions
  app.useGlobalFilters(new HttpExceptionFilter());

  // Configure Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('PQRS API')
    .setDescription('Especificación de la API de PQRS con control de autenticación')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Backend running on: http://localhost:${port}/api`);
  console.log(`Swagger Documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();
