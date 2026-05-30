import { Module } from '@nestjs/common';
import { PqrsModule } from '../pqrs/pqrs.module';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [PqrsModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
