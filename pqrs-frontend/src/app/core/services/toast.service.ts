import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id:       string;
  type:     'success' | 'error' | 'warning' | 'info';
  title:    string;
  message?: string;
  duration: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);

  show(toast: Omit<ToastMessage, 'id'>): void {
    const id = Math.random().toString(36).substring(2, 9);
    this.toasts.update(current => [...current, { ...toast, id }]);
    if (toast.duration > 0) {
      setTimeout(() => this.remove(id), toast.duration);
    }
  }

  success(title: string, message?: string): void {
    this.show({ type: 'success', title, message, duration: 4000 });
  }

  error(title: string, message?: string): void {
    this.show({ type: 'error', title, message, duration: 6000 });
  }

  warning(title: string, message?: string): void {
    this.show({ type: 'warning', title, message, duration: 5000 });
  }

  info(title: string, message?: string): void {
    this.show({ type: 'info', title, message, duration: 4000 });
  }

  remove(id: string): void {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }
}
