import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PqrsService } from '../../core/services/pqrs.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-public-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tracking-container">
      <h1>Consulta de Radicado</h1>
      <p>Ingresa tu número de radicado para conocer el estado de tu solicitud.</p>
      
      <div class="search-box">
        <input [(ngModel)]="radicado" placeholder="Ej: RS2026-0001" (keyup.enter)="buscar()">
        <button (click)="buscar()" [disabled]="loading()">
          <span *ngIf="loading()" class="spinner"></span>
          {{ loading() ? 'Buscando...' : 'Consultar' }}
        </button>
      </div>

      @if (resultado()) {
        <div class="result-card">
          <h3>{{ resultado().titulo }}</h3>
          <div class="status-timeline">
            <div class="step" [class.active]="true">Registrada: {{ resultado().createdAt | date }}</div>
            <div class="step" [class.active]="resultado().estado !== 'pendiente'">En Gestión</div>
            <div class="step" [class.active]="resultado().estado === 'resuelto' || resultado().estado === 'cerrado'">Finalizada</div>
          </div>
          <p>Estado actual: <strong>{{ resultado().estado | uppercase }}</strong></p>
        </div>
      }

      @if (error()) {
        <p class="error-msg">{{ error() }}</p>
      }
    </div>
  `,
  styles: [`.tracking-container { max-width: 500px; margin: 50px auto; text-align: center; font-family: sans-serif; }`]
})
export class PublicTrackingComponent {
  private pqrsService = inject(PqrsService);
  radicado = '';
  loading = signal(false);
  resultado = signal<any>(null);
  error = signal('');

  buscar() {
    if (!this.radicado) return;
    this.loading.set(true);
    (this.pqrsService as any).trackByRadicado(this.radicado).subscribe({
      next: (res: any) => { this.resultado.set(res); this.error.set(''); this.loading.set(false); },
      error: () => { this.error.set('No se encontró el radicado.'); this.resultado.set(null); this.loading.set(false); }
    });
  }
}