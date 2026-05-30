import { Component, OnInit, OnDestroy, inject, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable, Subscription, map, startWith } from 'rxjs';
import { PqrsService } from '../../../core/services/pqrs.service';
import { ToastService } from '../../../core/services/toast.service';
import { PqrsType, PqrsPriority } from '../../../core/models/pqrs.model';
import { PRIORITY_CONFIG, PRIORITY_OPTIONS } from '../../../core/constants/pqrs-priority.constants';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { CustomValidators } from '../../../core/validators/custom-validators';

const DRAFT_KEY = 'pqrs_draft';

@Component({
  selector: 'app-create-pqrs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent, TopbarComponent, UploadZoneComponent, ButtonComponent, ConfirmModalComponent],
  templateUrl: './create-pqrs.component.html',
  styleUrl: './create-pqrs.component.css',
})
export class CreatePqrsComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly pqrsService = inject(PqrsService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  @ViewChild(SidebarComponent) sidebar?: SidebarComponent;

  pqrsTypes = Object.values(PqrsType);
  priorityOptions = PRIORITY_OPTIONS;
  protected readonly PqrsPriority = PqrsPriority;
  protected readonly PqrsType = PqrsType;

  loading = signal(false);
  submitted = signal(false);
  errorMessage = signal<string | null>(null);
  showPriorityHint = signal(false);
  selectedFiles = signal<File[]>([]);
  showCancelModal = signal(false);

  tituloLength$!: Observable<number>;
  descripcionLength$!: Observable<number>;

  pqrsForm: FormGroup = this.fb.group({
    titulo: [
      '',
      [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(150),
        CustomValidators.noWhitespace,
      ],
    ],
    descripcion: [
      '',
      [
        Validators.required,
        Validators.minLength(30),
        Validators.maxLength(2000),
        CustomValidators.noWhitespace,
      ],
    ],
    tipo: ['', [Validators.required]],
    prioridad: [PqrsPriority.MEDIA, [Validators.required]],
  });

  private tipoSubscription?: Subscription;

  ngOnInit(): void {
    this.tituloLength$ = this.pqrsForm.get('titulo')!.valueChanges.pipe(
      map((v: string) => v?.length ?? 0),
      startWith(0),
    );
    this.descripcionLength$ = this.pqrsForm.get('descripcion')!.valueChanges.pipe(
      map((v: string) => v?.length ?? 0),
      startWith(0),
    );

    this.tipoSubscription = this.pqrsForm.get('tipo')?.valueChanges.subscribe((tipo) => {
      this.applyPrioritySuggestion(tipo as PqrsType);
    });

    // Restaurar borrador
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        this.pqrsForm.patchValue(parsed);
        this.toastService.info('Borrador restaurado', 'Se recuperó un borrador guardado automáticamente.');
      }
    } catch { /* ignore */ }

    // Guardar borrador en cada cambio
    this.pqrsForm.valueChanges.subscribe(value => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(value)); } catch { /* ignore */ }
    });
  }

  ngOnDestroy(): void {
    this.tipoSubscription?.unsubscribe();
  }

  openMobileSidebar(): void {
    this.sidebar?.openMobile();
  }

  requestCancel(): void {
    if (this.pqrsForm.dirty || this.selectedFiles().length > 0) {
      this.showCancelModal.set(true);
    } else {
      this.router.navigate(['/pqrs']);
    }
  }

  confirmCancel(): void {
    this.showCancelModal.set(false);
    localStorage.removeItem(DRAFT_KEY);
    this.router.navigate(['/pqrs']);
  }

  get availablePriorityOptions() {
    const tipo = this.pqrsForm.get('tipo')?.value as PqrsType;
    if (tipo === PqrsType.SUGERENCIA) {
      return this.priorityOptions.filter((opt) => opt.value !== PqrsPriority.URGENTE);
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
      if (current === PqrsPriority.URGENTE) prioridadControl.setValue(PqrsPriority.BAJA);
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
    formData.append('titulo', this.pqrsForm.get('titulo')?.value as string);
    formData.append('descripcion', this.pqrsForm.get('descripcion')?.value as string);
    formData.append('tipo', this.pqrsForm.get('tipo')?.value as string);
    formData.append('prioridad', this.pqrsForm.get('prioridad')?.value as string);

    this.selectedFiles().forEach((file) => formData.append('files', file));

    this.pqrsService.create(formData).subscribe({
      next: (created) => {
        this.loading.set(false);
        try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
        this.toastService.success(
          'PQRS registrada correctamente',
          `Tu solicitud fue registrada con el ID #${created.id.slice(-6).toUpperCase()}.`
        );
        this.router.navigate(['/pqrs']);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.mensajes?.[0] ?? err?.error?.message;
        this.errorMessage.set(
          Array.isArray(msg) ? (msg as string[])[0] : (msg as string | null) ?? 'Error al guardar la PQRS.',
        );
        // Scroll to top to show error
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      },
    });
  }
}
