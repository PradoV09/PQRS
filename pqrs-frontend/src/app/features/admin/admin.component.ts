import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { PqrsService } from '../../core/services/pqrs.service';
import { UsersService } from '../../core/services/users.service';
import { Pqrs, PqrsStatus, PqrsType } from '../../core/models/pqrs.model';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { FilesService } from '../../core/services/files.service';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { PqrsTypePipe } from '../../shared/pipes/pqrs-type.pipe';
import { getValidTransitions, isFinalState, STATUS_LABELS } from '../../core/utils/pqrs-transitions';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, PqrsTypePipe],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly pqrsService = inject(PqrsService);
  private readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);
  private readonly filesService = inject(FilesService);

  // Role helpers
  readonly isAdmin = computed(() => this.authService.currentUser()?.rol === 'admin');

  // Navigation state
  currentPage = signal<'dashboard' | 'pqrs' | 'usuarios' | 'detalle'>('dashboard');
  selectedPqrsId = signal<string | null>(null);

  // Dashboard data
  stats = signal<{ total: number; pendientes: number; enProceso: number; resueltos: number } | null>(null);
  recentPqrs = signal<Pqrs[]>([]);

  // PQRS data
  allPqrs = signal<Pqrs[]>([]);
  filteredPqrs = signal<Pqrs[]>([]);
  pqrsFilter = signal<{ search: string; tipo: string; estado: string }>({ search: '', tipo: '', estado: '' });

  // Users data
  allUsers = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  usersFilter = signal<{ search: string; rol: string; estado: string }>({ search: '', rol: '', estado: '' });

  // Detail data
  selectedPqrs = signal<Pqrs | null>(null);

  // User modal state
  showUserModal = signal(false);
  isEditMode = signal(false);
  editingUserId = signal<string | null>(null);
  userForm = signal<{ nombre: string; email: string; rol: string; password: string }>({
    nombre: '',
    email: '',
    rol: 'usuario',
    password: '',
  });

  protected readonly PqrsStatus = PqrsStatus;
  protected readonly PqrsType = PqrsType;

  ngOnInit(): void {
    this.loadDashboard();
    this.loadAllPqrs();
    if (this.isAdmin()) {
      this.loadAllUsers();
    }

    // Handle query parameter for tab navigation
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'usuarios') {
        this.currentPage.set('usuarios');
      } else if (params['tab'] === 'pqrs') {
        this.currentPage.set('pqrs');
      } else if (params['tab'] === 'dashboard') {
        this.currentPage.set('dashboard');
      }
    });
  }

  // Navigation
  showPage(page: 'dashboard' | 'pqrs' | 'usuarios' | 'detalle'): void {
    this.currentPage.set(page);
  }

  showDetail(pqrsId: string): void {
    this.selectedPqrsId.set(pqrsId);
    this.loadPqrsDetail(pqrsId);
    this.showPage('detalle');
  }

  // Dashboard
  loadDashboard(): void {
    this.pqrsService.getStats().subscribe({
      next: (stats) => {
        this.stats.set({
          total: stats.total,
          pendientes: stats.porEstado[PqrsStatus.PENDIENTE],
          enProceso: stats.porEstado[PqrsStatus.EN_PROCESO],
          resueltos: stats.porEstado[PqrsStatus.RESUELTO],
        });
      },
    });

    this.pqrsService.getAll({ page: 1, limit: 5 }).subscribe({
      next: (paginated) => {
        this.recentPqrs.set(paginated.data);
      },
    });
  }

  // PQRS
  loadAllPqrs(): void {
    this.pqrsService.getAll({ page: 1, limit: 100 }).subscribe({
      next: (paginated) => {
        this.allPqrs.set(paginated.data);
        this.applyPqrsFilter();
      },
    });
  }

  applyPqrsFilter(): void {
    const filter = this.pqrsFilter();
    let filtered = [...this.allPqrs()];

    if (filter.search) {
      const search = filter.search.toLowerCase();
      filtered = filtered.filter(p => p.titulo.toLowerCase().includes(search));
    }

    if (filter.tipo) {
      filtered = filtered.filter(p => p.tipo === filter.tipo);
    }

    if (filter.estado) {
      filtered = filtered.filter(p => p.estado === filter.estado);
    }

    this.filteredPqrs.set(filtered);
  }

  onPqrsFilterChange(key: string, value: string): void {
    this.pqrsFilter.update(f => ({ ...f, [key]: value }));
    this.applyPqrsFilter();
  }

  // Users
  loadAllUsers(): void {
    this.usersService.getAll().subscribe({
      next: (users) => {
        this.allUsers.set(users);
        this.applyUsersFilter();
      },
    });
  }

  applyUsersFilter(): void {
    const filter = this.usersFilter();
    let filtered = [...this.allUsers()];

    if (filter.search) {
      const search = filter.search.toLowerCase();
      filtered = filtered.filter(u =>
        u.nombre.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)
      );
    }

    if (filter.rol) {
      filtered = filtered.filter(u => u.rol === filter.rol);
    }

    if (filter.estado === 'activo') {
      filtered = filtered.filter(u => u.isActive);
    } else if (filter.estado === 'inactivo') {
      filtered = filtered.filter(u => !u.isActive);
    }

    this.filteredUsers.set(filtered);
  }

  onUsersFilterChange(key: string, value: string): void {
    this.usersFilter.update(f => ({ ...f, [key]: value }));
    this.applyUsersFilter();
  }

  toggleUserStatus(userId: string): void {
    this.usersService.toggleStatus(userId).subscribe({
      next: () => {
        this.loadAllUsers();
      },
    });
  }

  // Detail
  loadPqrsDetail(id: string): void {
    this.pqrsService.getById(id).subscribe({
      next: (pqrs) => {
        this.selectedPqrs.set(pqrs);
      },
    });
  }

  updatePqrsStatus(newStatus: PqrsStatus): void {
    const pqrs = this.selectedPqrs();
    if (!pqrs) return;

    this.pqrsService.updateStatus(pqrs.id, newStatus).subscribe({
      next: (updated) => {
        this.selectedPqrs.set({ ...pqrs, estado: updated.estado, resolvedAt: updated.resolvedAt });
        this.loadAllPqrs();
        this.loadDashboard();
      },
    });
  }

  // State machine getters
  get transicionesDisponibles(): PqrsStatus[] {
    const current = this.selectedPqrs()?.estado;
    if (!current) return [];
    return getValidTransitions(current);
  }

  get esEstadoFinal(): boolean {
    const current = this.selectedPqrs()?.estado;
    if (!current) return false;
    return isFinalState(current);
  }

  get statusLabels(): Record<PqrsStatus, string> {
    return STATUS_LABELS;
  }

  get puedeResponder(): boolean {
    const pqrs = this.selectedPqrs();
    if (!pqrs) return false;
    return !isFinalState(pqrs.estado);
  }

  createRespuesta(contenido: string): void {
    const pqrs = this.selectedPqrs();
    if (!pqrs || !contenido.trim()) return;

    this.pqrsService.createRespuesta(pqrs.id, contenido).subscribe({
      next: (respuesta) => {
        const currentRespuestas = pqrs.respuestas || [];
        this.selectedPqrs.set({
          ...pqrs,
          respuestas: [...currentRespuestas, respuesta],
        });
      },
    });
  }

  downloadAttachment(storedName: string): void {
    window.open(this.filesService.getFileUrl(storedName, true), '_blank');
  }

  // Helpers
  getStatusBadgeClass(estado: string): string {
    switch (estado) {
      case PqrsStatus.PENDIENTE: return 'b-pend';
      case PqrsStatus.EN_PROCESO: return 'b-proc';
      case PqrsStatus.RESUELTO: return 'b-res';
      case PqrsStatus.CERRADO: return 'b-cerr';
      default: return '';
    }
  }

  getRoleBadgeClass(rol: string): string {
    return rol === 'admin' ? 'b-admin' : 'b-user';
  }

  getStateBadgeClass(isActive: boolean): string {
    return isActive ? 'b-act' : 'b-ina';
  }

  // User CRUD methods
  showCreateUserModal(): void {
    this.isEditMode.set(false);
    this.editingUserId.set(null);
    this.userForm.set({ nombre: '', email: '', rol: 'usuario', password: '' });
    this.showUserModal.set(true);
  }

  showEditUserModal(user: User): void {
    this.isEditMode.set(true);
    this.editingUserId.set(user.id);
    this.userForm.set({ nombre: user.nombre, email: user.email, rol: user.rol, password: '' });
    this.showUserModal.set(true);
  }

  closeUserModal(): void {
    this.showUserModal.set(false);
    this.userForm.set({ nombre: '', email: '', rol: 'usuario', password: '' });
  }

  isUserFormValid(): boolean {
    const form = this.userForm();
    if (!form.nombre || !form.email || !form.rol) return false;
    if (!this.isEditMode() && (!form.password || form.password.length < 6)) return false;
    return true;
  }

  saveUser(): void {
    const form = this.userForm();
    if (!this.isUserFormValid()) return;

    if (this.isEditMode()) {
      const userId = this.editingUserId();
      if (userId) {
        this.usersService.update(userId, { nombre: form.nombre, rol: form.rol }).subscribe({
          next: () => {
            this.closeUserModal();
            this.loadAllUsers();
          },
        });
      }
    } else {
      this.usersService.create(form.nombre, form.email, form.password, form.rol).subscribe({
        next: () => {
          this.closeUserModal();
          this.loadAllUsers();
        },
      });
    }
  }

  deleteUser(userId: string): void {
    if (confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción es irreversible.')) {
      this.usersService.delete(userId).subscribe({
        next: () => {
          this.loadAllUsers();
        },
      });
    }
  }
}
