import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PqrsService } from '../../../core/services/pqrs.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Pqrs, PqrsStatus, PqrsType, PqrsPriority, PqrsStats } from '../../../core/models/pqrs.model';
import { PqrsTypePipe } from '../../../shared/pipes/pqrs-type.pipe';
import { PriorityBadgeComponent } from '../../../shared/components/priority-badge/priority-badge.component';
import { PRIORITY_OPTIONS } from '../../../core/constants/pqrs-priority.constants';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { PqrsStatsComponent } from '../components/pqrs-stats/pqrs-stats.component';
import { getValidTransitions } from '../../../core/utils/pqrs-transitions';

@Component({
  selector: 'app-pqrs-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PqrsTypePipe,
    PriorityBadgeComponent,
    SidebarComponent,
    PqrsStatsComponent,
  ],
  templateUrl: './pqrs-list.component.html',
  styleUrl: './pqrs-list.component.css',
})
export class PqrsListComponent implements OnInit, OnDestroy {
  private readonly pqrsService = inject(PqrsService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  // Perfil de usuario y roles
  isAdmin = signal(false);

  // Datos y paginación
  pqrsList = signal<Pqrs[]>([]);
  totalItems = signal(0);
  currentPage = signal(1);
  pageSize = signal(10);
  totalPages = signal(1);

  // Estadísticas (solo admin)
  stats = signal<PqrsStats | null>(null);

  // Estados de interfaz
  loading = signal(true);
  updatingStatusId = signal<string | null>(null);

  // Filtros activos
  searchQuery = signal<string>('');
  selectedType = signal<PqrsType | ''>('');
  selectedStatus = signal<PqrsStatus | ''>('');
  selectedPriority = signal<PqrsPriority | ''>('');
  fechaDesde = signal<string>('');
  fechaHasta = signal<string>('');
  sortBy = signal<'createdAt' | 'updatedAt' | 'estado'>('createdAt');
  sortOrder = signal<'ASC' | 'DESC'>('DESC');

  // Enums e Importaciones para el template
  pqrsTypes = Object.values(PqrsType);
  pqrsStatuses = Object.values(PqrsStatus);
  priorityOptions = PRIORITY_OPTIONS;
  protected readonly PqrsStatus = PqrsStatus;
  protected readonly PqrsPriority = PqrsPriority;
  protected readonly Math = Math;

  // Mapa local para rastrear la selección inline de cambio de estado de los admins en la tabla
  inlineSelectedStatus: Record<string, PqrsStatus> = {};

  // Subject para debouncing de recarga de datos al filtrar
  private readonly filterSubject = new Subject<void>();
  private filterSubscription?: Subscription;

  ngOnInit(): void {
    const role = this.authService.getCurrentUserRole();
    this.isAdmin.set(role === 'admin');

    // Configurar debounce de 400ms al escribir en búsqueda o cambiar filtros
    this.filterSubscription = this.filterSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadPqrs();
      });

    this.loadPqrs();

    if (this.isAdmin()) {
      this.loadStats();
    }
  }

  ngOnDestroy(): void {
    this.filterSubscription?.unsubscribe();
  }

  /**
   * Carga los datos de las PQRS desde el backend aplicando todos los filtros activos
   */
  loadPqrs(): void {
    this.loading.set(true);

    const queryParams = {
      page: this.currentPage(),
      limit: this.pageSize(),
      tipo: this.selectedType() || undefined,
      estado: this.selectedStatus() || undefined,
      prioridad: this.selectedPriority() || undefined,
      search: this.searchQuery() || undefined,
      fechaDesde: this.fechaDesde() || undefined,
      fechaHasta: this.fechaHasta() || undefined,
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
    };

    this.pqrsService.getAll(queryParams).subscribe({
      next: (paginated) => {
        this.pqrsList.set(paginated.data);
        this.totalItems.set(paginated.total);
        this.totalPages.set(paginated.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.pqrsList.set([]);
        this.toastService.error(
          err.error?.message || 'Error al conectar con el servidor para cargar las PQRS.'
        );
      },
    });
  }

  /**
   * Carga las estadísticas agregadas (Admin)
   */
  loadStats(): void {
    this.pqrsService.getStats().subscribe({
      next: (data) => this.stats.set(data),
      error: () => this.stats.set(null),
    });
  }

  /**
   * Dispara el debounce de los filtros
   */
  onFilterChange(): void {
    this.filterSubject.next();
  }

  /**
   * Manejador de entrada de texto con debounce para búsquedas
   */
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.filterSubject.next();
  }

  /**
   * Actualiza el filtro de tipo
   */
  onTypeFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as PqrsType | '';
    this.selectedType.set(value);
    this.currentPage.set(1);
    this.loadPqrs();
  }

  /**
   * Actualiza el filtro de estado
   */
  onStatusFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as PqrsStatus | '';
    this.selectedStatus.set(value);
    this.currentPage.set(1);
    this.loadPqrs();
  }

  onPriorityFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as PqrsPriority | '';
    this.selectedPriority.set(value);
    this.currentPage.set(1);
    this.loadPqrs();
  }

  /**
   * Cambia las fechas del filtro
   */
  onDateChange(type: 'desde' | 'hasta', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (type === 'desde') {
      this.fechaDesde.set(value);
    } else {
      this.fechaHasta.set(value);
    }
    this.currentPage.set(1);
    this.loadPqrs();
  }

  /**
   * Cambia la ordenación
   */
  onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as 'createdAt' | 'updatedAt' | 'estado';
    this.sortBy.set(value);
    this.loadPqrs();
  }

  /**
   * Cambia el sentido de ordenación
   */
  onSortOrderChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as 'ASC' | 'DESC';
    this.sortOrder.set(value);
    this.loadPqrs();
  }

  /**
   * Navega a la página elegida
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.currentPage.set(page);
      this.loadPqrs();
      this.scrollToTop();
    }
  }

  /**
   * Navega a la página anterior
   */
  prevPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  /**
   * Navega a la página siguiente
   */
  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  /**
   * Helper para scroll suave
   */
  private scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Obtiene las transiciones válidas para un estado en la vista
   */
  getTransitions(status: PqrsStatus): PqrsStatus[] {
    return getValidTransitions(status);
  }

  /**
   * Almacena temporalmente la selección del select inline de estado
   */
  onInlineStatusSelect(pqrsId: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value as PqrsStatus;
    this.inlineSelectedStatus[pqrsId] = value;
  }

  /**
   * Aplica la transición inline de estado (Solo Admin)
   */
  onUpdateStatusInline(pqrsId: string): void {
    const newStatus = this.inlineSelectedStatus[pqrsId];
    if (!newStatus) return;

    this.updatingStatusId.set(pqrsId);
    this.pqrsService.updateStatus(pqrsId, newStatus).subscribe({
      next: () => {
        this.updatingStatusId.set(null);
        delete this.inlineSelectedStatus[pqrsId];
        this.toastService.success('Estado actualizado correctamente.');
        this.loadPqrs();
        this.loadStats(); // Recargar los indicadores
      },
      error: (err) => {
        this.updatingStatusId.set(null);
        this.toastService.error(
          err.error?.message || 'Error al intentar actualizar el estado.'
        );
      },
    });
  }

  /**
   * Navega al detalle de una PQRS
   */
  viewDetails(id: string): void {
    this.router.navigate(['/pqrs', id]);
  }
}
