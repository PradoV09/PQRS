import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PqrsService } from '../../../core/services/pqrs.service';
import { ToastService } from '../../../core/services/toast.service';
import { PqrsType, PqrsPriority } from '../../../core/models/pqrs.model';
import { PRIORITY_CONFIG, PRIORITY_OPTIONS } from '../../../core/constants/pqrs-priority.constants';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';

@Component({
  selector: 'app-create-pqrs',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    SidebarComponent,
    UploadZoneComponent,
  ],
  templateUrl: './create-pqrs.component.html',
  styleUrl: './create-pqrs.component.css'
})
export class CreatePqrsComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly pqrsService = inject(PqrsService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  pqrsTypes = Object.values(PqrsType);
  priorityOptions = PRIORITY_OPTIONS;
  protected readonly PqrsPriority = PqrsPriority;
  protected readonly PqrsType = PqrsType;

  loading = signal(false);
  submitted = signal(false);
  errorMessage = signal<string | null>(null);
  showPriorityHint = signal(false);
  selectedFiles = signal<File[]>([]);

  pqrsForm: FormGroup = this.fb.group({
    titulo: ['', [
      Validators.required,
      Validators.minLength(5),
      Validators.maxLength(200)
    ]],
    descripcion: ['', [
      Validators.required,
      Validators.minLength(10)
    ]],
    tipo: ['', [Validators.required]],
    prioridad: [PqrsPriority.MEDIA, [Validators.required]],
  });

  private tipoSubscription?: Subscription;

  ngOnInit(): void {
    this.tipoSubscription = this.pqrsForm.get('tipo')?.valueChanges.subscribe(tipo => {
      this.applyPrioritySuggestion(tipo);
    });
  }

  ngOnDestroy(): void {
    this.tipoSubscription?.unsubscribe();
  }

  get availablePriorityOptions() {
    const tipo = this.pqrsForm.get('tipo')?.value as PqrsType;
    if (tipo === PqrsType.SUGERENCIA) {
      return this.priorityOptions.filter(opt => opt.value !== PqrsPriority.URGENTE);
    }
    return this.priorityOptions;
  }

  get slaLabel(): string {
    const p = this.pqrsForm.get('prioridad')?.value as PqrsPriority;
    return PRIORITY_CONFIG[p]?.slaLabel ?? '';
  }

  private applyPrioritySuggestion(tipo: PqrsType): void {
    const prioridadControl = this.pqrsForm.get('prioridad');
    if (!prioridadControl) return;

    const current = prioridadControl.value as PqrsPriority;

    if (tipo === PqrsType.RECLAMO && current === PqrsPriority.BAJA) {
      prioridadControl.setValue(PqrsPriority.ALTA);
      this.showPriorityHint.set(true);
    } else if (tipo === PqrsType.QUEJA && current === PqrsPriority.BAJA) {
      prioridadControl.setValue(PqrsPriority.MEDIA);
      this.showPriorityHint.set(true);
    } else if (tipo === PqrsType.SUGERENCIA) {
      if (current === PqrsPriority.URGENTE) {
        prioridadControl.setValue(PqrsPriority.BAJA);
      }
      this.showPriorityHint.set(true);
    } else if (tipo === PqrsType.PETICION && !prioridadControl.dirty) {
      prioridadControl.setValue(PqrsPriority.MEDIA);
    }
  }

  onFilesSelected(files: File[]): void {
    this.selectedFiles.set(files);
  }

  shouldShowError(fieldName: string): boolean {
    const control = this.pqrsForm.get(fieldName);
    if (!control) return false;
    return control.invalid && (control.touched || this.submitted());
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.pqrsForm.invalid) {
      this.pqrsForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    const formData = new FormData();
    formData.append('titulo', this.pqrsForm.get('titulo')?.value);
    formData.append('descripcion', this.pqrsForm.get('descripcion')?.value);
    formData.append('tipo', this.pqrsForm.get('tipo')?.value);
    formData.append('prioridad', this.pqrsForm.get('prioridad')?.value);

    this.selectedFiles().forEach(file => {
      formData.append('files', file);
    });

    this.pqrsService.create(formData).subscribe({
      next: () => {
        this.loading.set(false);
        this.toastService.success('Tu PQRS ha sido registrada exitosamente.');
        this.router.navigate(['/pqrs']);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.error && err.error.message) {
          this.errorMessage.set(
            Array.isArray(err.error.message)
              ? err.error.message[0]
              : err.error.message
          );
        } else {
          this.errorMessage.set('Error al guardar la PQRS. Por favor, intente de nuevo.');
        }
      }
    });
  }
}
