import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PqrsType } from '../../common/enums/pqrs-type.enum';
import { PqrsPriority } from '../../common/enums/pqrs-priority.enum';

export class CreatePqrsDto {
  @IsString({ message: 'El título debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El título es obligatorio.' })
  @MinLength(10, { message: 'El título debe tener al menos 10 caracteres.' })
  @MaxLength(150, { message: 'El título no puede superar 150 caracteres.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  titulo: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La descripción es obligatoria.' })
  @MinLength(30, { message: 'La descripción debe tener al menos 30 caracteres.' })
  @MaxLength(2000, { message: 'La descripción no puede superar 2000 caracteres.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  descripcion: string;

  @IsEnum(PqrsType, {
    message: `El tipo debe ser uno de: ${Object.values(PqrsType).join(', ')}.`,
  })
  tipo: PqrsType;

  @IsOptional()
  @IsEnum(PqrsPriority, {
    message: `La prioridad debe ser: ${Object.values(PqrsPriority).join(', ')}.`,
  })
  prioridad?: PqrsPriority;
}
