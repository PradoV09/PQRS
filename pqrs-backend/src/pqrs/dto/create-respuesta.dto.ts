import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRespuestaDto {
  @ApiProperty({
    description: 'Contenido de la respuesta',
    minLength: 5,
    maxLength: 2000,
    example: 'Estimado usuario, estamos atendiendo su solicitud y le daremos respuesta lo antes posible.',
  })
  @IsNotEmpty({ message: 'El contenido de la respuesta no puede estar vacío.' })
  @IsString({ message: 'El contenido de la respuesta debe ser una cadena de texto.' })
  @MinLength(5, { message: 'El contenido de la respuesta debe tener al menos 5 caracteres.' })
  @MaxLength(2000, { message: 'El contenido de la respuesta no puede superar los 2000 caracteres.' })
  contenido: string;
}
