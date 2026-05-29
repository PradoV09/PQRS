import { Pipe, PipeTransform } from '@angular/core';
import { PqrsPriority } from '../../core/models/pqrs.model';
import { PRIORITY_CONFIG } from '../../core/constants/pqrs-priority.constants';

@Pipe({ name: 'pqrsPriority', standalone: true })
export class PqrsPriorityPipe implements PipeTransform {
  transform(value: PqrsPriority | string): string {
    return PRIORITY_CONFIG[value as PqrsPriority]?.label ?? value;
  }
}
