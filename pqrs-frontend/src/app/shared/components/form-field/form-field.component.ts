import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl } from '@angular/forms';
import { getErrorMessage } from '../../../core/utils/form-error.util';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form-field.component.html',
  styleUrls: ['./form-field.component.css'],
})
export class FormFieldComponent {
  @Input() control!: AbstractControl | null;
  @Input() label?: string;
  @Input() hint?: string;
  @Input() required = false;
  @Input() customMessages: Record<string, string> = {};

  get hasError(): boolean {
    return !!this.control?.invalid && !!this.control?.touched;
  }

  get isValidating(): boolean {
    return !!this.control?.pending;
  }

  get isValid(): boolean {
    return !!this.control?.valid && !!this.control?.touched;
  }

  get errorMessage(): string | null {
    return getErrorMessage(this.control, this.customMessages);
  }
}
