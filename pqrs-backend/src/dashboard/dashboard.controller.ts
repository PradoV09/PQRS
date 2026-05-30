import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PqrsService } from '../pqrs/pqrs.service';
import { DashboardStatsDto } from '../pqrs/dto/dashboard-stats.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly pqrsService: PqrsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas generales del sistema PQRS' })
  async getStats(): Promise<DashboardStatsDto> {
    return this.pqrsService.getDashboardStats();
  }
}
