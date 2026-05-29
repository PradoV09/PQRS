import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { PqrsAttachment } from '../pqrs/entities/pqrs-attachment.entity';
import { Pqrs } from '../pqrs/entities/pqrs.entity';
import { PqrsModule } from '../pqrs/pqrs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PqrsAttachment, Pqrs]),
    forwardRef(() => PqrsModule),
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
