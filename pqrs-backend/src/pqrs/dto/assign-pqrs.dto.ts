import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { PqrsArea } from '../../common/enums/pqrs-area.enum';

export class AssignPqrsDto {
    @IsOptional()
    @IsUUID('4', { message: 'supervisorAsignadoId debe ser un UUID válido.' })
    supervisorAsignadoId?: string;

    @IsOptional()
    @IsEnum(PqrsArea, {
        message: `El área debe ser una de: ${Object.values(PqrsArea).join(', ')}.`,
    })
    area?: PqrsArea;
}
