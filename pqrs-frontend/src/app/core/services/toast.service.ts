import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  toasts = signal<ToastMessage[]>([]);

  /**
   * Muestra una notificación de éxito.
   */
  success(message: string): void {
    this.show('success', message);
  }

  /**
   * Muestra una notificación de error.
   */
  error(message: string): void {
    this.show('error', message);
  }

  /**
   * Muestra una notificación de información.
   */
  info(message: string): void {
    this.show('info', message);
  }

  /**
   * Registra y encola una notificación, programando su eliminación tras 4 segundos.
   */
  private show(type: 'success' | 'error' | 'info', message: string): void {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, type, message };

    this.toasts.update((current) => [...current, newToast]);

    // Eliminar automáticamente a los 4 segundos
    setTimeout(() => {
      this.remove(id);
    }, 4000);
  }

  /**
   * Elimina una notificación de la lista.
   */
  remove(id: string): void {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }
}
