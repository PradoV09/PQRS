import { IsEnum } from 'class-validator';
import { PqrsStatus } from '../../common/enums/pqrs-status.enum';

export class UpdatePqrsStatusDto {
  @IsEnum(PqrsStatus, { message: 'El estado de la PQRS no es válido.' })
  estado: PqrsStatus;
}
