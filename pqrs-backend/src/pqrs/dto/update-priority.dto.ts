import { IsEnum, IsNotEmpty } from 'class-validator';
import { PqrsPriority } from '../../common/enums/pqrs-priority.enum';

export class UpdatePriorityDto {
  @IsEnum(PqrsPriority)
  @IsNotEmpty()
  prioridad: PqrsPriority;
}
