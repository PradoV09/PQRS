import { IsEnum, IsInt, IsOptional, Max, Min, IsString, IsUUID, IsDateString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { PqrsType } from '../../common/enums/pqrs-type.enum';
import { PqrsStatus } from '../../common/enums/pqrs-status.enum';
import { PqrsPriority } from '../../common/enums/pqrs-priority.enum';

export class PqrsQueryDto {
  @IsOptional()
  @IsEnum(PqrsType, { message: 'El tipo especificado no es válido.' })
  tipo?: PqrsType;

  @IsOptional()
  @IsEnum(PqrsStatus, { message: 'El estado especificado no es válido.' })
  estado?: PqrsStatus;

  @IsOptional()
  @IsEnum(PqrsPriority, { message: 'La prioridad especificada no es válida.' })
  prioridad?: PqrsPriority;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero.' })
  @Min(1, { message: 'La página mínima es 1.' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero.' })
  @Min(1, { message: 'El límite mínimo es 1.' })
  @Max(100, { message: 'El límite máximo es 100.' })
  limit?: number = 10;

  @IsOptional()
  @IsString({ message: 'La búsqueda debe ser un texto.' })
  search?: string;

  @IsOptional()
  @IsUUID('all', { message: 'El ID de usuario debe ser un UUID válido.' })
  userId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha desde debe tener un formato de fecha válido.' })
  fechaDesde?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha hasta debe tener un formato de fecha válido.' })
  fechaHasta?: string;

  @IsOptional()
  @IsString()
  radicado?: string;

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'estado'], { message: 'El campo de ordenamiento no es válido.' })
  sortBy?: 'createdAt' | 'updatedAt' | 'estado' = 'createdAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'], { message: 'El orden debe ser ASC o DESC.' })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
