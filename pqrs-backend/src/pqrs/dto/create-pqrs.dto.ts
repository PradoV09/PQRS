import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PqrsType } from '../../common/enums/pqrs-type.enum';
import { PqrsPriority } from '../../common/enums/pqrs-priority.enum';

export class CreatePqrsDto {
  @IsString({ message: 'El título debe ser una de cadena de texto.' })
  @MinLength(5, { message: 'El título debe tener al menos 5 caracteres.' })
  @MaxLength(200, { message: 'El título no puede superar los 200 caracteres.' })
  titulo: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto.' })
  @MinLength(10, { message: 'La descripción debe tener al menos 10 caracteres.' })
  descripcion: string;

  @IsEnum(PqrsType, { message: 'El tipo de PQRS no es válido.' })
  tipo: PqrsType;

  @IsEnum(PqrsPriority, { message: 'La prioridad especificada no es válida.' })
  @IsOptional()
  prioridad?: PqrsPriority = PqrsPriority.MEDIA;
}
