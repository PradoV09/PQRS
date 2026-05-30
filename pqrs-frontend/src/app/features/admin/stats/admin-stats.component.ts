import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { DashboardService } from '../../../core/services/dashboard.service';
import { DashboardStats } from '../../../core/models/dashboard.model';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, SidebarComponent],
  templateUrl: './admin-stats.component.html',
  styleUrls: ['./admin-stats.component.css'],
})
export class AdminStatsComponent implements OnInit {
  stats: DashboardStats | null = null;
  loading = true;
  error = false;

  estadosChartData: ChartData<'doughnut'> = {
    labels: ['Pendientes', 'En proceso', 'Resueltas', 'Cerradas'],
    datasets: [
      {
        data: [],
        backgroundColor: ['#FAEEDA', '#E6F1FB', '#E1F5EE', '#F1EFE8'],
        borderColor: ['#633806', '#0C447C', '#085041', '#444441'],
        borderWidth: 1,
      },
    ],
  };

  tiposChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        label: 'Cantidad',
        data: [],
        backgroundColor: '#0C447C',
        borderRadius: 4,
      },
    ],
  };

  tendenciaChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        label: 'Creadas',
        data: [],
        borderColor: '#0C447C',
        tension: 0.4,
        fill: false,
      },
      {
        label: 'Resueltas',
        data: [],
        borderColor: '#085041',
        tension: 0.4,
        fill: false,
      },
    ],
  };

  prioridadChartData: ChartData<'doughnut'> = {
    labels: ['Alta', 'Media', 'Baja', 'Urgente'],
    datasets: [
      {
        data: [],
        backgroundColor: ['#FCEBEB', '#FAEEDA', '#E1F5EE', '#F5E6FB'],
        borderColor: ['#501313', '#633806', '#085041', '#3B0A4F'],
        borderWidth: 1,
      },
    ],
  };

  chartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  constructor(private readonly dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.dashboardService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.buildCharts(stats);
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  private buildCharts(s: DashboardStats): void {
    this.estadosChartData = {
      ...this.estadosChartData,
      datasets: [
        {
          ...this.estadosChartData.datasets[0],
          data: [s.totalPendientes, s.totalEnProceso, s.totalResueltas, s.totalCerradas],
        },
      ],
    };

    this.tiposChartData = {
      labels: s.porTipo.map((t) => t.tipo),
      datasets: [
        {
          label: 'Cantidad',
          data: s.porTipo.map((t) => t.cantidad),
          backgroundColor: '#0C447C',
          borderRadius: 4,
        },
      ],
    };

    const todasFechas = [
      ...new Set([
        ...s.creadasPorDia.map((d) => d.fecha),
        ...s.resueltasPorDia.map((d) => d.fecha),
      ]),
    ].sort();

    this.tendenciaChartData = {
      labels: todasFechas,
      datasets: [
        {
          label: 'Creadas',
          data: todasFechas.map(
            (f) => s.creadasPorDia.find((d) => d.fecha === f)?.cantidad ?? 0,
          ),
          borderColor: '#0C447C',
          tension: 0.4,
          fill: false,
        },
        {
          label: 'Resueltas',
          data: todasFechas.map(
            (f) => s.resueltasPorDia.find((d) => d.fecha === f)?.cantidad ?? 0,
          ),
          borderColor: '#085041',
          tension: 0.4,
          fill: false,
        },
      ],
    };

    this.prioridadChartData = {
      ...this.prioridadChartData,
      datasets: [
        {
          ...this.prioridadChartData.datasets[0],
          data: ['alta', 'media', 'baja', 'urgente'].map(
            (p) => s.porPrioridad.find((x) => x.prioridad === p)?.cantidad ?? 0,
          ),
        },
      ],
    };
  }

  formatHoras(horas: number | null): string {
    if (horas === null) return '—';
    if (horas < 24) return `${horas}h`;
    return `${Math.round(horas / 24)}d`;
  }
}
