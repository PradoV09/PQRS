export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'usuario';
  isActive: boolean;
  lockedUntil?: string | Date;
  createdAt: string;
  updatedAt: string;
}
