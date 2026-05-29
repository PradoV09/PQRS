import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PqrsStats, PqrsType, PqrsStatus } from '../../../../core/models/pqrs.model';

@Component({
  selector: 'app-pqrs-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stats-container" *ngIf="stats">
      <!-- Fila de Tarjetas Métricas -->
      <div class="stats-grid">
        <div class="metric-card total">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
          <div class="metric-details">
            <span class="metric-label">Total Solicitudes</span>
            <h3 class="metric-value">{{ stats.total }}</h3>
          </div>
        </div>

        <div class="metric-card pendiente">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div class="metric-details">
            <span class="metric-label">Pendientes</span>
            <h3 class="metric-value">{{ stats.porEstado[PqrsStatus.PENDIENTE] || 0 }}</h3>
          </div>
        </div>

        <div class="metric-card proceso">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>
          <div class="metric-details">
            <span class="metric-label">En Proceso</span>
            <h3 class="metric-value">{{ stats.porEstado[PqrsStatus.EN_PROCESO] || 0 }}</h3>
          </div>
        </div>

        <div class="metric-card resuelto">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div class="metric-details">
            <span class="metric-label">Resueltas</span>
            <h3 class="metric-value">{{ stats.porEstado[PqrsStatus.RESUELTO] || 0 }}</h3>
          </div>
        </div>

        <div class="metric-card urgente">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div class="metric-details">
            <span class="metric-label">Urgentes abiertas</span>
            <h3 class="metric-value">{{ stats.urgentesAbiertas || 0 }}</h3>
          </div>
        </div>
      </div>

      <!-- Sección de Desglose de Tipos e Info Adicional -->
      <div class="details-grid">
        <!-- Columna Izquierda: Barras de Progreso por Tipo -->
        <div class="details-card block-types">
          <h4 class="details-title">Distribución por Tipo</h4>
          <div class="type-bars-list">
            
            <!-- Petición -->
            <div class="bar-group">
              <div class="bar-header">
                <span class="bar-name">Petición</span>
                <span class="bar-count">
                  {{ stats.porTipo[PqrsType.PETICION] || 0 }} ({{ getPercentage(PqrsType.PETICION) }}%)
                </span>
              </div>
              <div class="progress-track">
                <div class="progress-fill peticion" [style.width.%]="getPercentage(PqrsType.PETICION)"></div>
              </div>
            </div>

            <!-- Queja -->
            <div class="bar-group">
              <div class="bar-header">
                <span class="bar-name">Queja</span>
                <span class="bar-count">
                  {{ stats.porTipo[PqrsType.QUEJA] || 0 }} ({{ getPercentage(PqrsType.QUEJA) }}%)
                </span>
              </div>
              <div class="progress-track">
                <div class="progress-fill queja" [style.width.%]="getPercentage(PqrsType.QUEJA)"></div>
              </div>
            </div>

            <!-- Reclamo -->
            <div class="bar-group">
              <div class="bar-header">
                <span class="bar-name">Reclamo</span>
                <span class="bar-count">
                  {{ stats.porTipo[PqrsType.RECLAMO] || 0 }} ({{ getPercentage(PqrsType.RECLAMO) }}%)
                </span>
              </div>
              <div class="progress-track">
                <div class="progress-fill reclamo" [style.width.%]="getPercentage(PqrsType.RECLAMO)"></div>
              </div>
            </div>

            <!-- Sugerencia -->
            <div class="bar-group">
              <div class="bar-header">
                <span class="bar-name">Sugerencia</span>
                <span class="bar-count">
                  {{ stats.porTipo[PqrsType.SUGERENCIA] || 0 }} ({{ getPercentage(PqrsType.SUGERENCIA) }}%)
                </span>
              </div>
              <div class="progress-track">
                <div class="progress-fill sugerencia" [style.width.%]="getPercentage(PqrsType.SUGERENCIA)"></div>
              </div>
            </div>

          </div>
        </div>

        <!-- Columna Derecha: Métricas Auxiliares -->
        <div class="details-card block-extra">
          <h4 class="details-title">Eficiencia y Actividad</h4>
          
          <div class="extra-metrics-list">
            <div class="extra-item">
              <div class="extra-icon week">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div class="extra-content">
                <span class="extra-label">Creadas esta semana</span>
                <span class="extra-value">{{ stats.ultimosSieteDias }}</span>
              </div>
            </div>

            <div class="extra-item">
              <div class="extra-icon speed">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 14 14"></polyline>
                </svg>
              </div>
              <div class="extra-content">
                <span class="extra-label">Tiempo prom. de resolución</span>
                <span class="extra-value">
                  {{ stats.tiempoPromedioResolucion }} {{ stats.tiempoPromedioResolucion === 1 ? 'día' : 'días' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stats-container {
      margin-bottom: 2rem;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    
    /* Grid de tarjetas métricas */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .metric-card {
      background: white;
      border-radius: 16px;
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
    }

    .card-icon {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .card-icon svg {
      width: 1.5rem;
      height: 1.5rem;
    }

    /* Temas para tarjetas */
    .total .card-icon { background-color: #eff6ff; color: #1d4ed8; }
    .pendiente .card-icon { background-color: #fffbeb; color: #b45309; }
    .proceso .card-icon { background-color: #f0fdf4; color: #15803d; }
    .resuelto .card-icon { background-color: #fdf2f8; color: #be185d; }
    .urgente .card-icon { background-color: #FCEBEB; color: #E24B4A; }
    .metric-card.urgente {
      border: 2px solid #E24B4A;
    }

    .metric-details {
      display: flex;
      flex-direction: column;
    }

    .metric-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .metric-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0.15rem 0 0;
      line-height: 1.1;
    }

    /* Grid de desglose inferior */
    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 1.25rem;
    }

    .details-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.01);
    }

    .details-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 1.25rem;
      letter-spacing: -0.01em;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 0.75rem;
    }

    /* Estilos barra de distribución */
    .type-bars-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .bar-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .bar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.825rem;
      font-weight: 600;
    }

    .bar-name { color: #334155; }
    .bar-count { color: #64748b; }

    .progress-track {
      height: 8px;
      background-color: #f1f5f9;
      border-radius: 9999px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.4s ease-out;
    }

    .progress-fill.peticion { background-color: #2563eb; }
    .progress-fill.queja { background-color: #dc2626; }
    .progress-fill.reclamo { background-color: #d97706; }
    .progress-fill.sugerencia { background-color: #16a34a; }

    /* Estilos info eficiencia */
    .extra-metrics-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      justify-content: center;
      height: calc(100% - 2.5rem);
    }

    .extra-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background-color: #f8fafc;
      border-radius: 12px;
      border: 1px solid #f1f5f9;
    }

    .extra-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .extra-icon svg {
      width: 1.25rem;
      height: 1.25rem;
    }

    .extra-icon.week { background-color: #f0fdf4; color: #16a34a; }
    .extra-icon.speed { background-color: #faf5ff; color: #8b5cf6; }

    .extra-content {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .extra-label {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 500;
    }

    .extra-value {
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f172a;
    }
  `]
})
export class PqrsStatsComponent {
  @Input() stats!: PqrsStats;

  protected readonly PqrsType = PqrsType;
  protected readonly PqrsStatus = PqrsStatus;

  /**
   * Obtiene el porcentaje de un tipo específico de PQRS sobre el total,
   * redondeado a entero y gestionando división por cero.
   */
  getPercentage(tipo: PqrsType): number {
    if (!this.stats || this.stats.total === 0) return 0;
    const count = this.stats.porTipo[tipo] || 0;
    return Math.round((count / this.stats.total) * 100);
  }
}
