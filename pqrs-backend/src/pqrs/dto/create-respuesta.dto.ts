import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRespuestaDto {
  @ApiProperty({
    description: 'Contenido de la respuesta',
    minLength: 10,
    maxLength: 5000,
    example: 'Estimado usuario, estamos atendiendo su solicitud y le daremos respuesta lo antes posible.',
  })
  @IsString({ message: 'El contenido de la respuesta debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El contenido de la respuesta es obligatorio.' })
  @MinLength(10, { message: 'La respuesta debe tener al menos 10 caracteres.' })
  @MaxLength(5000, { message: 'La respuesta no puede superar 5000 caracteres.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  contenido: string;
}
