import { Pipe, PipeTransform } from '@angular/core';
import { PqrsStatus } from '../../core/models/pqrs.model';
import { STATUS_LABELS } from '../../core/utils/pqrs-transitions';

@Pipe({ name: 'pqrsStatus', standalone: true })
export class PqrsStatusPipe implements PipeTransform {
  transform(value: PqrsStatus | string): string {
    return STATUS_LABELS[value as PqrsStatus] ?? value;
  }
}
