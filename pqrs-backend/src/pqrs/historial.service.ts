import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PqrsHistorial } from './entities/pqrs-historial.entity';
import { PqrsEventType } from '../common/enums/pqrs-event-type.enum';
import { UserRole } from '../users/entities/user.entity';

export interface RegistrarEventoParams {
  pqrsId: string;
  tipoEvento: PqrsEventType;
  actor: { id: string; nombre: string } | null;
  detalle?: Record<string, unknown>;
  descripcion: string;
}

@Injectable()
export class HistorialService {
  constructor(
    @InjectRepository(PqrsHistorial)
    private readonly historialRepo: Repository<PqrsHistorial>,
  ) {}

  /**
   * Registra un evento en el historial.
   * Nunca lanza excepción: si el log falla, la acción principal no debe fallar.
   */
  async registrar(params: RegistrarEventoParams): Promise<void> {
    try {
      const evento = this.historialRepo.create({
        pqrsId: params.pqrsId,
        tipoEvento: params.tipoEvento,
        actorId: params.actor?.id ?? null,
        actorNombre: params.actor?.nombre ?? 'Sistema',
        detalle: params.detalle ?? null,
        descripcion: params.descripcion,
      });
      await this.historialRepo.save(evento);
    } catch (err) {
      console.warn('[HistorialService] No se pudo registrar evento:', err);
    }
  }

  /**
   * Devuelve el historial completo de una PQRS, ordenado cronológicamente.
   * Filtra eventos de borrado para usuarios no admin.
   */
  async obtenerPorPqrs(pqrsId: string, userRole: string): Promise<any[]> {
    const eventos = await this.historialRepo.find({
      where: { pqrsId },
      order: { createdAt: 'ASC' },
    });

    const filtrados =
      userRole === UserRole.ADMIN
        ? eventos
        : eventos.filter(
            (e) =>
              e.tipoEvento !== PqrsEventType.ARCHIVO_ELIMINADO &&
              e.tipoEvento !== PqrsEventType.PQRS_ELIMINADA,
          );

    return filtrados.map((e) => ({
      id: e.id,
      tipoEvento: e.tipoEvento,
      detalle: e.detalle,
      descripcion: e.descripcion,
      createdAt: e.createdAt,
      actorNombre: e.actorNombre,
    }));
  }
}
