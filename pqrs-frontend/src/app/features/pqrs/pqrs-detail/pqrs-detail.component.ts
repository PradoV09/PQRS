import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PqrsService } from '../../../core/services/pqrs.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Pqrs, PqrsStatus, PqrsPriority, PqrsEvento } from '../../../core/models/pqrs.model';
import { PqrsTypePipe } from '../../../shared/pipes/pqrs-type.pipe';
import { RelativeDatePipe } from '../../../shared/pipes/relative-date.pipe';
import { PriorityBadgeComponent } from '../../../shared/components/priority-badge/priority-badge.component';
import { PqrsTimelineComponent } from '../../../shared/components/pqrs-timeline/pqrs-timeline.component';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { AttachmentGalleryComponent } from '../../../shared/components/attachment-gallery/attachment-gallery.component';
import { getValidTransitions, isFinalState, STATUS_LABELS } from '../../../core/utils/pqrs-transitions';
import { PRIORITY_CONFIG, PRIORITY_OPTIONS } from '../../../core/constants/pqrs-priority.constants';

@Component({
  selector: 'app-pqrs-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    PqrsTypePipe,
    RelativeDatePipe,
    PriorityBadgeComponent,
    PqrsTimelineComponent,
    SidebarComponent,
    AttachmentGalleryComponent,
  ],
  templateUrl: './pqrs-detail.component.html',
  styleUrl: './pqrs-detail.component.css',
})
export class PqrsDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pqrsService = inject(PqrsService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  pqrs = signal<Pqrs | null>(null);
  loading = signal(true);
  isNotFound = signal(false);
  updatingStatus = signal(false);
  updatingPriority = signal(false);
  loadingHistorial = signal(true);
  historial = signal<PqrsEvento[]>([]);

  respuestaContenido = signal<string>('');
  sendingRespuesta = signal(false);

  isAdmin = signal(false);
  isOwner = signal(false);

  selectedNewStatus = signal<PqrsStatus | ''>('');
  nuevaPrioridad = signal<PqrsPriority>(PqrsPriority.MEDIA);

  priorityOptions = PRIORITY_OPTIONS;
  priorityConfig = PRIORITY_CONFIG;

  isClosed = computed(() => this.pqrs()?.estado === PqrsStatus.CERRADO);

  canRespond = computed(() => {
    const data = this.pqrs();
    if (!data) return false;
    if (isFinalState(data.estado)) return false;

    if (this.isAdmin()) return true;
    return (
      this.isOwner() &&
      (data.estado === PqrsStatus.PENDIENTE || data.estado === PqrsStatus.EN_PROCESO)
    );
  });

  get transicionesDisponibles(): PqrsStatus[] {
    const current = this.pqrs()?.estado;
    if (!current) return [];
    return getValidTransitions(current);
  }

  get esEstadoFinal(): boolean {
    const current = this.pqrs()?.estado;
    if (!current) return false;
    return isFinalState(current);
  }

  get esSlaVencido(): boolean {
    const data = this.pqrs();
    if (!data?.fechaLimite) return false;
    return new Date(data.fechaLimite) < new Date();
  }

  get statusLabels(): Record<PqrsStatus, string> {
    return STATUS_LABELS;
  }

  protected readonly PqrsStatus = PqrsStatus;

  ngOnInit(): void {
    const role = this.authService.getCurrentUserRole();
    this.isAdmin.set(role === 'admin');

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadPqrsDetail(id);
        this.loadHistorial(id);
      } else {
        this.isNotFound.set(true);
        this.loading.set(false);
      }
    });
  }

  private loadPqrsDetail(id: string): void {
    this.loading.set(true);
    this.isNotFound.set(false);

    this.pqrsService.getById(id).subscribe({
      next: (data) => {
        this.pqrs.set(data);
        this.nuevaPrioridad.set(data.prioridad ?? PqrsPriority.MEDIA);
        const currentUserId = this.authService.getCurrentUserId();
        this.isOwner.set(data.userId === currentUserId);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.isNotFound.set(true);
        } else if (err.status === 403) {
          this.toastService.error('No tienes permisos para acceder a esta PQRS.');
          this.router.navigate(['/pqrs']);
        } else {
          this.toastService.error('Error al cargar la información.');
        }
      },
    });
  }

  private loadHistorial(id: string): void {
    this.loadingHistorial.set(true);
    this.pqrsService.getHistorial(id).subscribe({
      next: (eventos) => {
        this.historial.set(eventos);
        this.loadingHistorial.set(false);
      },
      error: () => {
        this.historial.set([]);
        this.loadingHistorial.set(false);
      },
    });
  }

  get allowedTransitions(): PqrsStatus[] {
    const current = this.pqrs()?.estado;
    if (!current) return [];
    return getValidTransitions(current);
  }

  onUpdateStatus(): void {
    const newStatus = this.selectedNewStatus();
    const pqrsId = this.pqrs()?.id;

    if (!newStatus || !pqrsId) return;

    this.updatingStatus.set(true);
    this.pqrsService.updateStatus(pqrsId, newStatus).subscribe({
      next: (updated) => {
        this.updatingStatus.set(false);
        this.toastService.success('El estado ha sido actualizado exitosamente.');

        const currentPqrs = this.pqrs();
        if (currentPqrs) {
          this.pqrs.set({
            ...currentPqrs,
            estado: updated.estado,
            updatedAt: updated.updatedAt,
          });
        }
        this.selectedNewStatus.set('');
        this.loadHistorial(pqrsId);
      },
      error: (err) => {
        this.updatingStatus.set(false);
        const msg = err.error?.message || 'No se pudo actualizar el estado.';
        this.toastService.error(Array.isArray(msg) ? msg[0] : msg);
      },
    });
  }

  cambiarPrioridad(): void {
    const pqrsData = this.pqrs();
    if (!pqrsData) return;

    this.updatingPriority.set(true);
    this.pqrsService.updatePriority(pqrsData.id, this.nuevaPrioridad()).subscribe({
      next: (updated) => {
        const current = this.pqrs();
        if (current) {
          this.pqrs.set({
            ...current,
            prioridad: updated.prioridad,
            fechaLimite: updated.fechaLimite,
          });
        }
        this.toastService.success('Prioridad actualizada');
        this.updatingPriority.set(false);
        this.loadHistorial(pqrsData.id);
      },
      error: (err) => {
        this.toastService.error(err.error?.message ?? 'Error al actualizar');
        this.updatingPriority.set(false);
      },
    });
  }

  submitRespuesta(): void {
    const contenido = this.respuestaContenido().trim();
    const pqrsData = this.pqrs();
    if (!contenido || contenido.length < 5 || !pqrsData) return;

    this.sendingRespuesta.set(true);
    this.pqrsService.createRespuesta(pqrsData.id, contenido).subscribe({
      next: (nuevaRespuesta) => {
        this.sendingRespuesta.set(false);
        this.respuestaContenido.set('');

        const respuestasActuales = pqrsData.respuestas || [];

        const nuevoEstado = (this.isAdmin() && pqrsData.estado === PqrsStatus.PENDIENTE)
          ? PqrsStatus.EN_PROCESO
          : pqrsData.estado;

        this.pqrs.set({
          ...pqrsData,
          estado: nuevoEstado,
          respuestas: [...respuestasActuales, nuevaRespuesta],
        });

        this.toastService.success('Tu respuesta ha sido publicada.');
        this.loadHistorial(pqrsData.id);
      },
      error: (err) => {
        this.sendingRespuesta.set(false);
        this.toastService.error(
          err.error?.message || 'Error al intentar enviar la respuesta.'
        );
      },
    });
  }

  onDeletePqrs(): void {
    const pqrsId = this.pqrs()?.id;
    if (!pqrsId) return;

    const confirmDelete = confirm(
      '¿Estás seguro de que deseas eliminar esta PQRS? Esta acción es irreversible, borrará permanentemente la solicitud y todos sus archivos asociados.'
    );

    if (confirmDelete) {
      this.pqrsService.delete(pqrsId).subscribe({
        next: () => {
          this.toastService.success('PQRS eliminada correctamente.');
          this.router.navigate(['/pqrs']);
        },
        error: () => {
          this.toastService.error('Ocurrió un error al intentar eliminar la PQRS.');
        },
      });
    }
  }

  onAttachmentDeleted(attachmentId: string): void {
    const currentPqrs = this.pqrs();
    if (!currentPqrs) return;

    this.pqrs.set({
      ...currentPqrs,
      attachments: currentPqrs.attachments.filter(att => att.id !== attachmentId),
    });
    this.loadHistorial(currentPqrs.id);
  }
}
