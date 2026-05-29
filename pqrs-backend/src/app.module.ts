import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PqrsModule } from './pqrs/pqrs.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    // Global Config Module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Asynchronous TypeORM Configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: parseInt(configService.get<string>('DB_PORT', '5432'), 10),
        username: configService.get<string>('DB_USER', 'pqrs_user'),
        password: configService.get<string>('DB_PASSWORD', 'pqrs_pass'),
        database: configService.get<string>('DB_NAME', 'pqrs'),
        autoLoadEntities: true,
        synchronize: false, // Always false - use migrations
        logging: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),

    // Rate Limiting (10 requests per minute)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10,  // 10 requests
      },
    ]),

    UsersModule,
    AuthModule,
    PqrsModule,
    FilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
