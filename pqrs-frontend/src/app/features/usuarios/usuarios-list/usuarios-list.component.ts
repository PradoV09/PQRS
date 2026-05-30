import { Component, OnInit, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsersService } from '../../../core/services/users.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { User } from '../../../core/models/user.model';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent, SkeletonComponent, StatusBadgeComponent, ConfirmModalComponent],
  templateUrl: './usuarios-list.component.html',
  styleUrl: './usuarios-list.component.css',
})
export class UsuariosListComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly authService  = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router       = inject(Router);

  @ViewChild(SidebarComponent) sidebar?: SidebarComponent;

  users        = signal<User[]>([]);
  loading      = signal(true);
  togglingId   = signal<string | null>(null);
  editingRolId = signal<string | null>(null);
  editingRol   = signal<'admin' | 'usuario'>('usuario');

  filterRol    = signal<'admin' | 'usuario' | ''>('');
  filterActive = signal<'true' | 'false' | ''>('');
  searchQuery  = signal('');

  confirmUserId   = signal<string | null>(null);
  confirmUserName = signal('');

  undoTimer: ReturnType<typeof setTimeout> | null = null;

  readonly currentUserId = computed(() => this.authService.getCurrentUserId());

  readonly adminCount = computed(() =>
    this.users().filter(u => u.rol === 'admin').length
  );

  readonly filteredUsers = computed(() => {
    let list = this.users();
    if (this.filterRol())    list = list.filter(u => u.rol === this.filterRol());
    if (this.filterActive() !== '') list = list.filter(u => String(u.isActive) === this.filterActive());
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      list = list.filter(u => u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return list;
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.usersService.getAll().subscribe({
      next: (data) => { this.users.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toastService.error('Error al cargar usuarios.'); },
    });
  }

  openMobileSidebar(): void {
    this.sidebar?.openMobile();
  }

  requestToggle(user: User): void {
    if (user.id === this.currentUserId()) return;
    this.confirmUserId.set(user.id);
    this.confirmUserName.set(user.nombre);
  }

  confirmToggle(): void {
    const id = this.confirmUserId();
    this.confirmUserId.set(null);
    if (!id) return;

    this.togglingId.set(id);
    this.usersService.toggleStatus(id).subscribe({
      next: (updated) => {
        this.togglingId.set(null);
        this.users.update(list => list.map(u => u.id === id ? updated : u));
        const action = updated.isActive ? 'activado' : 'desactivado';
        this.toastService.success(`Usuario ${action} correctamente.`);
      },
      error: () => {
        this.togglingId.set(null);
        this.toastService.error('Error al cambiar el estado del usuario.');
      },
    });
  }

  startEditRol(user: User): void {
    this.editingRolId.set(user.id);
    this.editingRol.set(user.rol);
  }

  cancelEditRol(): void {
    this.editingRolId.set(null);
  }

  saveRol(userId: string): void {
    if (userId === this.currentUserId()) return;
    this.usersService.update(userId, { rol: this.editingRol() }).subscribe({
      next: (updated) => {
        this.users.update(list => list.map(u => u.id === userId ? updated : u));
        this.editingRolId.set(null);
        this.toastService.success('Rol actualizado correctamente.');
      },
      error: () => {
        this.toastService.error('Error al actualizar el rol.');
      },
    });
  }

  avatarColor(name: string): string {
    const colors = ['#0C447C', '#085041', '#633806', '#501313', '#3C3489', '#444441', '#0A6B3A', '#6B0A44'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  goToDetail(id: string): void {
    this.router.navigate(['/admin'], { queryParams: { usuario: id } });
  }
}
