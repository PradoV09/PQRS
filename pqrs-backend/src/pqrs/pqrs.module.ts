import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PqrsService } from './pqrs.service';
import { PqrsController } from './pqrs.controller';
import { HistorialService } from './historial.service';
import { Pqrs } from './entities/pqrs.entity';
import { PqrsAttachment } from './entities/pqrs-attachment.entity';
import { PqrsRespuesta } from './entities/pqrs-respuesta.entity';
import { PqrsHistorial } from './entities/pqrs-historial.entity';
import { UsersModule } from '../users/users.module';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pqrs, PqrsAttachment, PqrsRespuesta, PqrsHistorial]),
    UsersModule,
    forwardRef(() => FilesModule),
    NotificationsModule,
  ],
  controllers: [PqrsController],
  providers: [PqrsService, HistorialService],
  exports: [PqrsService, HistorialService],
})
export class PqrsModule { }
