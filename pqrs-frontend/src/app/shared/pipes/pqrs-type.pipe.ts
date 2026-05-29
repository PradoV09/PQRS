import { Pipe, PipeTransform } from '@angular/core';
import { PqrsType } from '../../core/models/pqrs.model';

@Pipe({
  name: 'pqrsType',
  standalone: true,
})
export class PqrsTypePipe implements PipeTransform {
  transform(value: string | PqrsType): string {
    const mappings: Record<string, string> = {
      [PqrsType.PETICION]: 'Petición',
      [PqrsType.QUEJA]: 'Queja',
      [PqrsType.RECLAMO]: 'Reclamo',
      [PqrsType.SUGERENCIA]: 'Sugerencia',
    };
    return mappings[value] || value;
  }
}
