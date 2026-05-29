export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'usuario';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
