import { Routes } from '@angular/router';
import { RegisterComponent } from './features/auth/register/register.component';
import { LoginComponent } from './features/auth/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { PqrsListComponent } from './features/pqrs/pqrs-list/pqrs-list.component';
import { CreatePqrsComponent } from './features/pqrs/create-pqrs/create-pqrs.component';
import { PqrsDetailComponent } from './features/pqrs/pqrs-detail/pqrs-detail.component';
import { AdminComponent } from './features/admin/admin.component';
import { ForbiddenComponent } from './features/errors/forbidden/forbidden.component';
import { NotFoundComponent } from './features/errors/not-found/not-found.component';
import { PerfilComponent } from './features/perfil/perfil.component';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: 'register',    component: RegisterComponent,    canActivate: [guestGuard] },
  { path: 'login',       component: LoginComponent,       canActivate: [guestGuard] },
  { path: 'dashboard',   component: DashboardComponent,   canActivate: [authGuard] },
  { path: 'perfil',      component: PerfilComponent,      canActivate: [authGuard] },
  { path: 'pqrs',        component: PqrsListComponent,    canActivate: [authGuard] },
  { path: 'pqrs/crear',  component: CreatePqrsComponent,  canActivate: [authGuard] },
  { path: 'pqrs/:id',    component: PqrsDetailComponent,  canActivate: [authGuard] },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [authGuard, adminGuard],
    data: { roles: ['admin', 'supervisor'] },
  },
  { path: 'admin/pqrs', redirectTo: '/admin', pathMatch: 'full' },
  { path: 'forbidden',  component: ForbiddenComponent },
  { path: '',           redirectTo: 'login', pathMatch: 'full' },
  { path: '**',         component: NotFoundComponent },
];
