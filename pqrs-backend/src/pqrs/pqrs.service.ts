import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Not } from 'typeorm';
import { Pqrs } from './entities/pqrs.entity';
import { PqrsAttachment } from './entities/pqrs-attachment.entity';
import { PqrsRespuesta } from './entities/pqrs-respuesta.entity';
import { CreatePqrsDto } from './dto/create-pqrs.dto';
import { PqrsQueryDto } from './dto/pqrs-query.dto';
import { CreateRespuestaDto } from './dto/create-respuesta.dto';
import { UpdatePqrsStatusDto } from './dto/update-pqrs-status.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { PqrsStatus } from '../common/enums/pqrs-status.enum';
import { PqrsType } from '../common/enums/pqrs-type.enum';
import { PqrsPriority } from '../common/enums/pqrs-priority.enum';
import { calcularFechaLimite } from '../common/utils/sla.utils';
import { PqrsEventType } from '../common/enums/pqrs-event-type.enum';
import { HistorialService } from './historial.service';
import { UserRole } from '../users/entities/user.entity';
import * as fs from 'fs';
import * as path from 'path';
import { isValidTransition, getValidTransitions, isFinalState } from '../common/utils/pqrs-transitions';

@Injectable()
export class PqrsService {
  constructor(
    @InjectRepository(Pqrs)
    private readonly pqrsRepository: Repository<Pqrs>,
    @InjectRepository(PqrsAttachment)
    private readonly attachmentRepository: Repository<PqrsAttachment>,
    @InjectRepository(PqrsRespuesta)
    private readonly respuestaRepository: Repository<PqrsRespuesta>,
    private readonly historialService: HistorialService,
  ) { }

  /**
   * Crea una nueva PQRS y sus archivos adjuntos.
   */
  async create(
    createDto: CreatePqrsDto,
    userId: string,
    files: any[],
    actor: { id: string; nombre: string },
  ): Promise<Pqrs> {
    const { titulo, descripcion, tipo, prioridad } = createDto;

    const pqrs = this.pqrsRepository.create({
      titulo,
      descripcion,
      tipo,
      prioridad: prioridad ?? PqrsPriority.MEDIA,
      userId,
    });

    const savedPqrs = await this.pqrsRepository.save(pqrs);

    // Crear los registros de adjuntos en base de datos
    if (files && files.length > 0) {
      const attachments = files.map((file) => {
        const sanitizedFilename = path.basename(file.originalname);
        return this.attachmentRepository.create({
          filename: sanitizedFilename,
          storedName: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          path: `uploads/pqrs/${file.filename}`,
          pqrsId: savedPqrs.id,
        });
      });

      savedPqrs.attachments = await this.attachmentRepository.save(attachments);
    } else {
      savedPqrs.attachments = [];
    }

    await this.historialService.registrar({
      pqrsId: savedPqrs.id,
      tipoEvento: PqrsEventType.PQRS_CREADA,
      actor,
      detalle: {
        titulo: savedPqrs.titulo,
        tipo: savedPqrs.tipo,
        prioridad: savedPqrs.prioridad,
      },
      descripcion: `PQRS creada: "${savedPqrs.titulo}"`,
    });

    if (savedPqrs.attachments.length > 0) {
      for (const attachment of savedPqrs.attachments) {
        await this.historialService.registrar({
          pqrsId: savedPqrs.id,
          tipoEvento: PqrsEventType.ARCHIVO_SUBIDO,
          actor,
          detalle: {
            attachmentId: attachment.id,
            filename: attachment.filename,
            mimetype: attachment.mimetype,
            sizeBytes: attachment.size,
          },
          descripcion: `${actor.nombre} subió el archivo "${attachment.filename}"`,
        });
      }
    }

    return savedPqrs;
  }

  /**
   * Obtiene la lista de PQRS aplicando filtros y paginación.
   * Los usuarios normales solo ven sus PQRS, los administradores ven todas o filtran por usuario.
   */
  async findAll(queryDto: PqrsQueryDto, userId: string, userRole: string) {
    const {
      tipo,
      estado,
      prioridad,
      page = 1,
      limit = 10,
      search,
      userId: filterUserId,
      fechaDesde,
      fechaHasta,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryDto;

    const skip = (page - 1) * limit;

    const queryBuilder = this.pqrsRepository
      .createQueryBuilder('pqrs')
      .leftJoinAndSelect('pqrs.user', 'user')
      .leftJoinAndSelect('pqrs.attachments', 'attachments')
      .leftJoinAndSelect('pqrs.respuestas', 'respuestas');

    // Restricción por rol
    if (userRole === UserRole.ADMIN) {
      if (filterUserId) {
        queryBuilder.andWhere('pqrs.userId = :filterUserId', { filterUserId });
      }
    } else {
      // Si es un usuario normal, ver únicamente las suyas
      queryBuilder.andWhere('pqrs.userId = :userId', { userId });
    }

    // Filtros por enums
    if (tipo) {
      queryBuilder.andWhere('pqrs.tipo = :tipo', { tipo });
    }

    if (estado) {
      queryBuilder.andWhere('pqrs.estado = :estado', { estado });
    }

    if (prioridad) {
      queryBuilder.andWhere('pqrs.prioridad = :prioridad', { prioridad });
    }

    // Filtro por búsqueda
    if (search) {
      queryBuilder.andWhere(
        '(pqrs.titulo ILIKE :search OR pqrs.descripcion ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filtros de fecha
    if (fechaDesde) {
      queryBuilder.andWhere('pqrs.createdAt >= :fechaDesde', {
        fechaDesde: new Date(fechaDesde),
      });
    }

    if (fechaHasta) {
      const endOfDay = new Date(fechaHasta);
      endOfDay.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('pqrs.createdAt <= :fechaHasta', {
        fechaHasta: endOfDay,
      });
    }

    // Ordenamiento: prioridad (urgente primero) y luego fecha de creación
    queryBuilder
      .addOrderBy(
        `CASE pqrs.prioridad
          WHEN 'urgente' THEN 1
          WHEN 'alta'    THEN 2
          WHEN 'media'   THEN 3
          WHEN 'baja'    THEN 4
        END`,
        'ASC',
      )
      .addOrderBy(`pqrs.${sortBy}`, sortOrder);

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    // Mapear los datos para cumplir con la estructura ligera que incluye agregados de conteo y datos limpios del usuario
    const paginatedData = data
      .slice(skip, skip + limit)
      .map((item) => {
        return {
          id: item.id,
          titulo: item.titulo,
          descripcion: item.descripcion,
          tipo: item.tipo,
          estado: item.estado,
          prioridad: item.prioridad,
          fechaLimite: calcularFechaLimite(item.createdAt, item.prioridad).toISOString(),
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          user: item.user ? { id: item.user.id, nombre: item.user.nombre } : null,
          attachments: item.attachments || [],
          _count: {
            attachments: item.attachments ? item.attachments.length : 0,
            respuestas: item.respuestas ? item.respuestas.length : 0,
          },
        };
      });

    return {
      data: paginatedData,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Busca una PQRS por su ID validando permisos de lectura.
   * Carga adjuntos, respuestas con su autor y el creador de la PQRS.
   */
  async findOne(id: string, userId: string, userRole: string): Promise<any> {
    const pqrs = await this.pqrsRepository.findOne({
      where: { id },
      relations: {
        attachments: true,
        user: true,
        respuestas: {
          autor: true,
        },
      },
      order: {
        respuestas: {
          createdAt: 'ASC',
        },
      },
    });

    if (!pqrs) {
      throw new NotFoundException(`La PQRS con ID ${id} no existe.`);
    }

    // Validar propiedad: Solo el creador o un administrador pueden verla
    if (pqrs.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permisos para ver esta PQRS.');
    }

    // Sanitizar datos del usuario propietario
    const sanitizedUser = pqrs.user
      ? { id: pqrs.user.id, nombre: pqrs.user.nombre }
      : null;

    // Sanitizar respuestas y la relación autor
    const sanitizedRespuestas = (pqrs.respuestas || []).map((resp) => {
      return {
        id: resp.id,
        contenido: resp.contenido,
        esAdmin: resp.esAdmin,
        createdAt: resp.createdAt,
        autor: resp.autor
          ? { id: resp.autor.id, nombre: resp.autor.nombre, rol: resp.autor.rol }
          : null,
      };
    });

    return {
      id: pqrs.id,
      titulo: pqrs.titulo,
      descripcion: pqrs.descripcion,
      tipo: pqrs.tipo,
      estado: pqrs.estado,
      prioridad: pqrs.prioridad,
      fechaLimite: calcularFechaLimite(pqrs.createdAt, pqrs.prioridad).toISOString(),
      createdAt: pqrs.createdAt,
      updatedAt: pqrs.updatedAt,
      resolvedAt: pqrs.resolvedAt,
      userId: pqrs.userId,
      user: sanitizedUser,
      attachments: pqrs.attachments || [],
      respuestas: sanitizedRespuestas,
    };
  }

  /**
   * Crea una nueva respuesta a una PQRS.
   */
  async createRespuesta(
    pqrsId: string,
    createRespuestaDto: CreateRespuestaDto,
    userId: string,
    userRole: string,
  ): Promise<any> {
    const pqrs = await this.pqrsRepository.findOne({ where: { id: pqrsId } });
    if (!pqrs) {
      throw new NotFoundException(`La PQRS con ID ${pqrsId} no existe.`);
    }

    // Guard: rechazar respuestas en PQRS cerrada
    if (isFinalState(pqrs.estado)) {
      throw new BadRequestException(
        'Esta PQRS está cerrada y no admite más respuestas.',
      );
    }

    // Validación de permisos por rol
    const esAdmin = userRole === UserRole.ADMIN;
    if (!esAdmin) {
      if (pqrs.userId !== userId) {
        throw new ForbiddenException('No tienes permisos para responder en esta PQRS.');
      }
      if (pqrs.estado !== PqrsStatus.PENDIENTE && pqrs.estado !== PqrsStatus.EN_PROCESO) {
        throw new BadRequestException(
          'Solo puedes responder a solicitudes en estado "pendiente" o "en proceso".',
        );
      }
    }

    // Transición automática T-AUTO-01: admin responde a PENDIENTE → EN_PROCESO
    let fueTransicionAutomatica = false;
    if (esAdmin && pqrs.estado === PqrsStatus.PENDIENTE) {
      if (isValidTransition(pqrs.estado, PqrsStatus.EN_PROCESO)) {
        pqrs.estado = PqrsStatus.EN_PROCESO;
        await this.pqrsRepository.save(pqrs);
        fueTransicionAutomatica = true;
      }
    }

    const respuesta = this.respuestaRepository.create({
      contenido: createRespuestaDto.contenido,
      esAdmin,
      pqrsId,
      autorId: userId,
    });

    const savedRespuesta = await this.respuestaRepository.save(respuesta);

    // Retornar la respuesta con los datos de autor cargados y limpios
    const fullRespuesta = await this.respuestaRepository.findOne({
      where: { id: savedRespuesta.id },
      relations: { autor: true },
    });

    if (!fullRespuesta) {
      throw new NotFoundException('La respuesta creada no se pudo encontrar.');
    }

    const actor = fullRespuesta.autor
      ? { id: fullRespuesta.autor.id, nombre: fullRespuesta.autor.nombre }
      : { id: userId, nombre: 'Usuario' };

    await this.historialService.registrar({
      pqrsId,
      tipoEvento: PqrsEventType.RESPUESTA_AGREGADA,
      actor,
      detalle: {
        respuestaId: fullRespuesta.id,
        esAdmin: fullRespuesta.esAdmin,
        extracto: fullRespuesta.contenido.slice(0, 100),
      },
      descripcion: `${actor.nombre}${fullRespuesta.esAdmin ? ' (admin)' : ''} agregó una respuesta`,
    });

    if (fueTransicionAutomatica) {
      await this.historialService.registrar({
        pqrsId,
        tipoEvento: PqrsEventType.ESTADO_CAMBIADO,
        actor,
        detalle: {
          estadoAnterior: PqrsStatus.PENDIENTE,
          estadoNuevo: PqrsStatus.EN_PROCESO,
          esAutomatico: true,
        },
        descripcion: `Estado cambiado automáticamente a 'en_proceso' al recibir respuesta`,
      });
    }

    return {
      id: fullRespuesta.id,
      contenido: fullRespuesta.contenido,
      esAdmin: fullRespuesta.esAdmin,
      createdAt: fullRespuesta.createdAt,
      autor: fullRespuesta.autor
        ? {
          id: fullRespuesta.autor.id,
          nombre: fullRespuesta.autor.nombre,
          rol: fullRespuesta.autor.rol,
        }
        : null,
    };
  }

  /**
   * Actualiza el estado de una PQRS validando la máquina de estados.
   * Exclusivo para administradores.
   */
  async updateStatus(
    id: string,
    updateStatusDto: UpdatePqrsStatusDto,
    adminUserId: string,
    adminRole?: string,
    adminActor?: { id: string; nombre: string },
  ): Promise<any> {
    // Si se pasa el rol, verificarlo en el servicio para mayor seguridad
    if (adminRole && adminRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo los administradores pueden cambiar el estado de una PQRS.');
    }

    const pqrs = await this.pqrsRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!pqrs) {
      throw new NotFoundException(`La PQRS con ID ${id} no existe.`);
    }

    const currentStatus = pqrs.estado;
    const newStatus = updateStatusDto.estado;

    if (currentStatus === newStatus) {
      return pqrs;
    }

    // Validar la transición con la función compartida
    if (!isValidTransition(currentStatus, newStatus)) {
      const validTransitions = getValidTransitions(currentStatus);
      throw new BadRequestException(
        `Transición inválida: no se puede pasar de '${currentStatus}' a '${newStatus}'. ` +
        `Transiciones permitidas: ${validTransitions.join(', ') || 'ninguna (estado final)'}`,
      );
    }

    // Efectos secundarios según la transición
    if (newStatus === PqrsStatus.RESUELTO) {
      pqrs.resolvedAt = new Date();
    }

    pqrs.estado = newStatus;
    const updated = await this.pqrsRepository.save(pqrs);

    const actor = adminActor ?? { id: adminUserId, nombre: 'Administrador' };
    await this.historialService.registrar({
      pqrsId: id,
      tipoEvento: PqrsEventType.ESTADO_CAMBIADO,
      actor,
      detalle: {
        estadoAnterior: currentStatus,
        estadoNuevo: newStatus,
        esAutomatico: false,
      },
      descripcion: `Estado cambiado de '${currentStatus}' a '${newStatus}'`,
    });

    return {
      id: updated.id,
      titulo: updated.titulo,
      descripcion: updated.descripcion,
      tipo: updated.tipo,
      estado: updated.estado,
      prioridad: updated.prioridad,
      fechaLimite: calcularFechaLimite(updated.createdAt, updated.prioridad).toISOString(),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      resolvedAt: updated.resolvedAt,
      userId: updated.userId,
      user: updated.user ? { id: updated.user.id, nombre: updated.user.nombre } : null,
    };
  }

  /**
   * Actualiza la prioridad de una PQRS.
   * Exclusivo para administradores. No permite cambios en PQRS cerradas.
   */
  async updatePriority(
    id: string,
    dto: UpdatePriorityDto,
    adminRole: string,
    adminActor?: { id: string; nombre: string },
  ): Promise<any> {
    if (adminRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo los administradores pueden cambiar la prioridad',
      );
    }

    const pqrs = await this.pqrsRepository.findOne({ where: { id } });
    if (!pqrs) {
      throw new NotFoundException(`PQRS ${id} no encontrada`);
    }

    if (pqrs.estado === PqrsStatus.CERRADO) {
      throw new BadRequestException(
        'No se puede cambiar la prioridad de una PQRS cerrada',
      );
    }

    const prioridadAnterior = pqrs.prioridad;
    pqrs.prioridad = dto.prioridad;
    const updated = await this.pqrsRepository.save(pqrs);

    const actor = adminActor ?? { id: 'system', nombre: 'Administrador' };
    await this.historialService.registrar({
      pqrsId: id,
      tipoEvento: PqrsEventType.PRIORIDAD_CAMBIADA,
      actor,
      detalle: {
        prioridadAnterior,
        prioridadNueva: dto.prioridad,
      },
      descripcion: `Prioridad cambiada de '${prioridadAnterior}' a '${dto.prioridad}'`,
    });

    return {
      id: updated.id,
      titulo: updated.titulo,
      descripcion: updated.descripcion,
      tipo: updated.tipo,
      estado: updated.estado,
      prioridad: updated.prioridad,
      fechaLimite: calcularFechaLimite(updated.createdAt, updated.prioridad).toISOString(),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      resolvedAt: updated.resolvedAt,
      userId: updated.userId,
    };
  }

  /**
   * Elimina una PQRS y todos sus archivos asociados del disco.
   */
  async remove(
    id: string,
    userId: string,
    userRole: string,
    actor: { id: string; nombre: string },
  ): Promise<void> {
    const pqrs = await this.pqrsRepository.findOne({
      where: { id },
      relations: { attachments: true, respuestas: true },
    });

    if (!pqrs) {
      throw new NotFoundException(`La PQRS con ID ${id} no existe.`);
    }

    // Validar propiedad: Solo el creador o un administrador pueden eliminarla
    if (pqrs.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permisos para eliminar esta PQRS.');
    }

    await this.historialService.registrar({
      pqrsId: id,
      tipoEvento: PqrsEventType.PQRS_ELIMINADA,
      actor,
      detalle: {
        titulo: pqrs.titulo,
        totalAdjuntos: pqrs.attachments?.length ?? 0,
        totalRespuestas: pqrs.respuestas?.length ?? 0,
      },
      descripcion: `PQRS "${pqrs.titulo}" eliminada por ${actor.nombre}`,
    });

    // 1. Eliminar físicamente los archivos del disco
    if (pqrs.attachments && pqrs.attachments.length > 0) {
      for (const att of pqrs.attachments) {
        const fullPath = path.resolve(att.path);
        try {
          if (fs.existsSync(fullPath)) {
            await fs.promises.unlink(fullPath);
          }
        } catch (error) {
          console.error(`Error eliminando archivo adjunto del disco: ${fullPath}`, error);
        }
      }
    }

    // 2. Eliminar el registro de la base de datos (se disparará onDelete CASCADE para los adjuntos y respuestas)
    await this.pqrsRepository.remove(pqrs);
  }

  /**
   * Obtiene estadísticas de PQRS para el panel de administración.
   */
  async getStats(userRole: string) {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo los administradores pueden consultar estadísticas.');
    }

    // Total de PQRS
    const total = await this.pqrsRepository.count();

    // PQRS por estado
    const porEstado = {
      [PqrsStatus.PENDIENTE]: await this.pqrsRepository.countBy({ estado: PqrsStatus.PENDIENTE }),
      [PqrsStatus.EN_PROCESO]: await this.pqrsRepository.countBy({ estado: PqrsStatus.EN_PROCESO }),
      [PqrsStatus.RESUELTO]: await this.pqrsRepository.countBy({ estado: PqrsStatus.RESUELTO }),
      [PqrsStatus.CERRADO]: await this.pqrsRepository.countBy({ estado: PqrsStatus.CERRADO }),
    };

    // PQRS por tipo
    const porTipo = {
      [PqrsType.PETICION]: await this.pqrsRepository.countBy({ tipo: PqrsType.PETICION }),
      [PqrsType.QUEJA]: await this.pqrsRepository.countBy({ tipo: PqrsType.QUEJA }),
      [PqrsType.RECLAMO]: await this.pqrsRepository.countBy({ tipo: PqrsType.RECLAMO }),
      [PqrsType.SUGERENCIA]: await this.pqrsRepository.countBy({ tipo: PqrsType.SUGERENCIA }),
    };

    // PQRS por prioridad
    const porPrioridad = {
      [PqrsPriority.BAJA]: await this.pqrsRepository.countBy({ prioridad: PqrsPriority.BAJA }),
      [PqrsPriority.MEDIA]: await this.pqrsRepository.countBy({ prioridad: PqrsPriority.MEDIA }),
      [PqrsPriority.ALTA]: await this.pqrsRepository.countBy({ prioridad: PqrsPriority.ALTA }),
      [PqrsPriority.URGENTE]: await this.pqrsRepository.countBy({ prioridad: PqrsPriority.URGENTE }),
    };

    const urgentesAbiertas = await this.pqrsRepository.countBy({
      prioridad: PqrsPriority.URGENTE,
      estado: Not(PqrsStatus.CERRADO),
    });

    // PQRS creadas en los últimos 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const ultimosSieteDias = await this.pqrsRepository.countBy({
      createdAt: MoreThanOrEqual(sevenDaysAgo),
    });

    // Tiempo promedio de resolución en días ( createdAt vs updatedAt donde estado = 'resuelto')
    const resueltas = await this.pqrsRepository.find({
      where: { estado: PqrsStatus.RESUELTO },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    let tiempoPromedioResolucion = 0;
    if (resueltas.length > 0) {
      const totalDiffMs = resueltas.reduce((sum, item) => {
        const diff = item.updatedAt.getTime() - item.createdAt.getTime();
        return sum + diff;
      }, 0);
      const totalDiffDays = totalDiffMs / (1000 * 60 * 60 * 24);
      tiempoPromedioResolucion = parseFloat((totalDiffDays / resueltas.length).toFixed(2));
    }

    return {
      total,
      porEstado,
      porTipo,
      porPrioridad,
      urgentesAbiertas,
      ultimosSieteDias,
      tiempoPromedioResolucion,
    };
  }

  /**
   * Obtiene la ruta física absoluta de un archivo adjunto si el usuario tiene permisos de acceso.
   */
  async getAttachmentPath(
    pqrsId: string,
    attachmentId: string,
    userId: string,
    userRole: string,
  ): Promise<{ absolutePath: string; filename: string; mimetype: string }> {
    const pqrs = await this.pqrsRepository.findOne({ where: { id: pqrsId } });
    if (!pqrs) {
      throw new NotFoundException(`La PQRS con ID ${pqrsId} no existe.`);
    }

    // Validar permisos
    if (pqrs.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permisos para acceder a los archivos de esta PQRS.');
    }

    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId, pqrsId },
    });

    if (!attachment) {
      throw new NotFoundException(`El archivo adjunto no existe en esta PQRS.`);
    }

    const absolutePath = path.resolve(attachment.path);
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException(`El archivo no se encuentra físicamente en el servidor.`);
    }

    return {
      absolutePath,
      filename: attachment.filename,
      mimetype: attachment.mimetype,
    };
  }
}
