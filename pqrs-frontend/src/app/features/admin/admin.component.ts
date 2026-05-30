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
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, PqrsTypePipe],
  // Nota: Asegúrate de agregar TopbarComponent, PqrsStatsComponent, etc. aquí si tienes errores de compilación
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
  stats = signal<{
    total: number;
    pendientes: number;
    enProceso: number;
    resueltos: number;
    vencidas: number;
    proximas: number;
    eficiencia: number;
    porArea?: any[];
  } | null>(null);
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
    this.selectedPqrs.set(null); // Limpiar detalle previo
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
          pendientes: stats.porEstado[PqrsStatus.PENDIENTE] || 0,
          enProceso: stats.porEstado[PqrsStatus.EN_PROCESO] || 0,
          resueltos: stats.porEstado[PqrsStatus.RESUELTO] || 0,
          vencidas: stats.cumplimiento?.vencidas || 0,
          proximas: stats.cumplimiento?.proximaVencer || 0,
          eficiencia: stats.cumplimiento?.eficiencia ?? 100,
          porArea: stats.porArea
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
    const { search, tipo, estado } = this.pqrsFilter();
    const filtered = this.allPqrs().filter(p => {
      const matchesSearch = !search || p.titulo.toLowerCase().includes(search.toLowerCase()) || p.radicado.toLowerCase().includes(search.toLowerCase());
      const matchesTipo = !tipo || p.tipo === tipo;
      const matchesEstado = !estado || p.estado === estado;
      return matchesSearch && matchesTipo && matchesEstado;
    });
    this.filteredPqrs.set(filtered);
  }

  isOverdue(pqrs: Pqrs): boolean {
    if (!pqrs.fechaLimite || pqrs.estado === PqrsStatus.CERRADO || pqrs.estado === PqrsStatus.RESUELTO) return false;
    return new Date(pqrs.fechaLimite) < new Date();
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

  isUserLocked(user: User): boolean {
    if (!user.lockedUntil) return false;
    return new Date(user.lockedUntil) > new Date();
  }

  onUsersFilterChange(key: string, value: string): void {
    this.usersFilter.update(f => ({ ...f, [key]: value }));
    this.applyUsersFilter();
  }

  // Método para exportar a CSV (Cumple con requerimiento de Reportes)
  exportToCSV(): void {
    const data = this.allPqrs();
    const headers = 'Radicado,Titulo,Tipo,Estado,Prioridad,Creado\n';
    const rows = data.map(p =>
      `${p.radicado},"${p.titulo}",${p.tipo},${p.estado},${p.prioridad},${p.createdAt}`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_pqrs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  // Generar Reporte Gerencial Consolidado (Cumple con Requisito de Estadísticas Globales)
  exportConsolidatedReportPDF(): void {
    const s = this.stats();
    if (!s) return;

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(26, 86, 219); // Azul corporativo
    doc.text('INFORME GERENCIAL DE GESTIÓN PQRS', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Resumen de Operación', 20, 45);

    doc.setFontSize(11);
    doc.text(`Total Solicitudes: ${s.total}`, 25, 55);
    doc.text(`Eficiencia del Servicio (SLA): ${s.eficiencia}%`, 25, 62);
    doc.text(`PQRS Vencidas: ${s.vencidas}`, 25, 69);
    doc.text(`PQRS Próximas a Vencer: ${s.proximas}`, 25, 76);

    doc.text('Distribución por Estado', 20, 90);
    doc.text(`- Pendientes: ${s.pendientes}`, 25, 100);
    doc.text(`- En Proceso: ${s.enProceso}`, 25, 107);
    doc.text(`- Resueltos: ${s.resueltos}`, 25, 114);

    if (s.porArea) {
      doc.text('Carga por Área Administrativa', 20, 130);
      s.porArea.forEach((area, i) => {
        doc.text(`- ${area.area || 'Sin Asignar'}: ${area.cantidad} solicitudes`, 25, 140 + (i * 7));
      });
    }

    doc.save(`Reporte_Gerencial_PQRS_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // Generar Reporte PDF Oficial (Cumple con Reportes y Estadísticas)
  exportToPDF(): void {
    const pqrs = this.selectedPqrs();
    if (!pqrs) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('CERTIFICADO OFICIAL DE TRAZABILIDAD PQRS', 105, 20, { align: 'center' });

    doc.setFontSize(11);
    doc.text(`Radicado: ${pqrs.radicado}`, 20, 40);
    doc.text(`Fecha Creación: ${pqrs.createdAt}`, 20, 50);
    doc.text(`Ciudadano: ${pqrs.user?.nombre}`, 20, 60);
    doc.text(`Tipo: ${pqrs.tipo.toUpperCase()}`, 20, 70);
    doc.text(`Estado Actual: ${pqrs.estado.toUpperCase()}`, 20, 80);

    doc.text('RESUMEN DE DESCRIPCIÓN:', 20, 100);
    doc.setFontSize(10);
    const splitDesc = doc.splitTextToSize(pqrs.descripcion, 170);
    doc.text(splitDesc, 20, 110);

    doc.save(`Reporte_Oficial_${pqrs.radicado}.pdf`);
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
    if (confirm('¿Estás seguro de que deseas eliminar este usuario? Si tiene PQRS asociadas, la operación fallará. Se recomienda usar "Desactivar" para conservar el historial.')) {
      this.usersService.delete(userId).subscribe({
        next: () => {
          this.loadAllUsers();
        },
        error: (err) => {
          alert('No se pudo eliminar el usuario porque tiene registros de PQRS asociados. Por favor, desactívelo en su lugar.');
        },
      });
    }
  }
}
