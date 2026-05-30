import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Not, In } from 'typeorm';
import { Pqrs } from './entities/pqrs.entity';
import { PqrsAttachment } from './entities/pqrs-attachment.entity';
import { PqrsRespuesta } from './entities/pqrs-respuesta.entity';
import { PqrsHistorial } from './entities/pqrs-historial.entity';
import { CreatePqrsDto } from './dto/create-pqrs.dto';
import { PqrsQueryDto } from './dto/pqrs-query.dto';
import { CreateRespuestaDto } from './dto/create-respuesta.dto';
import { UpdatePqrsStatusDto } from './dto/update-pqrs-status.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { AssignPqrsDto } from './dto/assign-pqrs.dto';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { PqrsStatus } from '../common/enums/pqrs-status.enum';
import { PqrsType } from '../common/enums/pqrs-type.enum';
import { PqrsPriority } from '../common/enums/pqrs-priority.enum';
import { PqrsArea } from '../common/enums/pqrs-area.enum';
import { calcularFechaLimite, calcularFechaLimiteLegal } from '../common/utils/sla.utils';
import { PqrsEventType } from '../common/enums/pqrs-event-type.enum';
import { HistorialService } from './historial.service';
import { EmailService } from '../notifications/email.service';
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
    @InjectRepository(PqrsHistorial)
    private readonly historialRepo: Repository<PqrsHistorial>,
    private readonly historialService: HistorialService,
    private readonly emailService: EmailService,
  ) { }

  /**
   * Crea una nueva PQRS y sus archivos adjuntos.
   */
  async create(
    createDto: CreatePqrsDto,
    userId: string,
    files: any[],
    actor: { id: string; nombre: string; email?: string },
  ): Promise<Pqrs> {
    // Regla de negocio: máximo 10 PQRS activas por usuario
    const activasCount = await this.pqrsRepository
      .createQueryBuilder('p')
      .where('p.userId = :userId', { userId })
      .andWhere(`p.estado NOT IN ('resuelto', 'cerrado')`)
      .getCount();

    if (activasCount >= 10) {
      throw new BadRequestException(
        'Has alcanzado el límite de 10 PQRS activas. ' +
        'Espera a que alguna sea resuelta o cerrada antes de crear una nueva.',
      );
    }

    const { titulo, descripcion, tipo, prioridad } = createDto;

    // Generar número de radicado secuencial: RS-AÑO-CORRELATIVO
    const currentYear = new Date().getFullYear();
    const count = await this.pqrsRepository.count({
      where: { createdAt: MoreThanOrEqual(new Date(`${currentYear}-01-01`)) }
    });
    const radicado = `RS${currentYear}-${(count + 1).toString().padStart(4, '0')}`;

    const pqrs = this.pqrsRepository.create({
      radicado,
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

    if (actor.email) {
      this.emailService.sendPqrsCreada({
        to: actor.email,
        nombre: actor.nombre,
        pqrsId: savedPqrs.id,
        titulo: savedPqrs.titulo,
        tipo: savedPqrs.tipo,
        radicado: savedPqrs.radicado,
      });
    }

    return savedPqrs;
  }

  /**
   * Obtiene la lista de PQRS aplicando filtros y paginación.
   * Los usuarios normales solo ven sus PQRS, los administradores ven todas o filtran por usuario.
   */
  async findAll(queryDto: PqrsQueryDto, userId: string, userRole: string) {
    if (!userId || !userRole) {
      throw new ForbiddenException('Credenciales de acceso incompletas para listar PQRS.');
    }

    // 1. Extracción y Saneamiento de Parámetros
    const tipo = queryDto.tipo;
    const estado = queryDto.estado;
    const prioridad = queryDto.prioridad;
    const search = queryDto.search;
    const radicado = queryDto.radicado;
    const filterUserId = queryDto.userId;
    const fechaDesde = queryDto.fechaDesde;
    const fechaHasta = queryDto.fechaHasta;

    // 2. CONVERSIÓN NUMÉRICA SEGURA (Evita Error 500 en PostgreSQL)
    // Forzamos que page y limit sean números reales antes de skip/take
    const numericPage = Math.max(Number(queryDto.page) || 1, 1);
    // RNF-02.2: Límite máximo de 50 registros por página para proteger el rendimiento
    const numericLimit = Math.min(Math.max(Number(queryDto.limit) || 10, 1), 50);
    const skip = (numericPage - 1) * numericLimit;

    // 3. VALIDACIÓN DE ORDENAMIENTO (Whitelist contra Inyección SQL)
    const allowedSortFields = ['createdAt', 'titulo', 'radicado', 'tipo', 'estado', 'prioridad'];
    const sortBy = queryDto.sortBy || 'createdAt';
    const actualSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const sortOrder = queryDto.sortOrder || 'DESC';
    const actualSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const queryBuilder = this.pqrsRepository
      .createQueryBuilder('pqrs')
      .leftJoinAndSelect('pqrs.user', 'user')
      .leftJoinAndSelect('pqrs.supervisorAsignado', 'supervisor')
      .leftJoinAndSelect('pqrs.attachments', 'attachments')
      .leftJoinAndSelect('pqrs.respuestas', 'respuestas')
      .addSelect(
        `(CASE pqrs.prioridad
          WHEN 'urgente' THEN 1
          WHEN 'alta'    THEN 2
          WHEN 'media'   THEN 3
          WHEN 'baja'    THEN 4
          ELSE 5
        END)`,
        'prioridad_orden',
      );

    // Restricción por rol
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPERVISOR) {
      if (filterUserId) {
        queryBuilder.andWhere('pqrs.userId = :filterUserId', { filterUserId });
      }
    } else {
      // Si es un usuario normal, ver únicamente las suyas
      queryBuilder.andWhere('pqrs.userId = :userId', { userId });
    }

    // Filtros por enums
    if (radicado) {
      queryBuilder.andWhere('pqrs.radicado = :radicado', { radicado });
    }

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

    // 4. ORDENAMIENTO ROBUSTO
    // Usamos .orderBy para limpiar cualquier orden previo y establecer la prioridad como eje principal
    queryBuilder
      .orderBy('prioridad_orden', 'ASC')
      // .addOrderBy para el criterio secundario (dinámico y seguro)
      .addOrderBy(`pqrs.${actualSortBy}`, actualSortOrder as 'ASC' | 'DESC')
      .skip(skip)
      .take(numericLimit);

    // 5. EJECUCIÓN Y RESPUESTA
    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / numericLimit);

    const paginatedData = (data || []).map((item) => ({
      id: item.id,
      radicado: item.radicado || 'N/A',
      titulo: item.titulo || 'Sin título',
      tipo: item.tipo,
      estado: item.estado,
      prioridad: item.prioridad,
      fechaLimite: this.getSafeSlaDate(item.createdAt, item.prioridad),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      user: item.user?.id ? { id: item.user.id, nombre: item.user.nombre } : null,
      attachments: Array.isArray(item.attachments)
        ? item.attachments.filter(a => !!a).map(a => ({ ...a }))
        : [],
      _count: {
        attachments: Array.isArray(item.attachments) ? item.attachments.filter(a => !!a).length : 0,
        respuestas: Array.isArray(item.respuestas) ? item.respuestas.length : 0,
      },
    }));

    return {
      data: paginatedData,
      total,
      page: numericPage,
      limit: numericLimit,
      totalPages,
    };
  }

  /**
   * Calcula la fecha SLA de forma segura. 
   * Prioriza los términos legales de la Ley 1755 de 2015.
   */
  private getSafeSlaDate(createdAt: Date, prioridad: PqrsPriority, tipo?: PqrsType): string | null {
    if (!createdAt) return null;

    // Si tenemos el tipo, usamos el cálculo legal (Ley 1755)
    // Si no, caemos al cálculo por prioridad como respaldo
    const date = tipo
      ? calcularFechaLimiteLegal(createdAt, tipo)
      : calcularFechaLimite(createdAt, prioridad);

    return date ? date.toISOString() : null;
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
        supervisorAsignado: true,
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

    // Validar permisos: el creador, supervisor asignado, o admin pueden verla
    const esCreador = pqrs.userId === userId;
    const esGestion = userRole === UserRole.ADMIN || userRole === UserRole.SUPERVISOR;

    if (!esCreador && !esGestion) {
      throw new ForbiddenException('No tienes permisos para ver esta PQRS.');
    }

    const sanitizedSupervisor = pqrs.supervisorAsignado
      ? { id: pqrs.supervisorAsignado.id, nombre: pqrs.supervisorAsignado.nombre, email: pqrs.supervisorAsignado.email }
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
      radicado: pqrs.radicado,
      titulo: pqrs.titulo,
      descripcion: pqrs.descripcion,
      tipo: pqrs.tipo,
      estado: pqrs.estado,
      prioridad: pqrs.prioridad,
      area: pqrs.area,
      supervisorAsignado: sanitizedSupervisor,
      fechaLimite: this.getSafeSlaDate(pqrs.createdAt, pqrs.prioridad, pqrs.tipo),
      createdAt: pqrs.createdAt,
      updatedAt: pqrs.updatedAt,
      resolvedAt: pqrs.resolvedAt,
      userId: pqrs.userId,
      user: pqrs.user ? { id: pqrs.user.id, nombre: pqrs.user.nombre } : null,
      attachments: pqrs.attachments || [],
      respuestas: sanitizedRespuestas,
    };
  }

  /**
   * Consulta pública de estado por número de radicado.
   * Devuelve información mínima no sensible.
   */
  async trackByRadicado(radicado: string) {
    const pqrs = await this.pqrsRepository.findOne({
      where: { radicado },
      select: {
        radicado: true,
        tipo: true,
        estado: true,
        createdAt: true,
        titulo: true,
      },
    });

    if (!pqrs) {
      throw new NotFoundException(`No se encontró ninguna solicitud con el radicado ${radicado}.`);
    }

    return pqrs;
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
    const pqrs = await this.pqrsRepository.findOne({
      where: { id: pqrsId },
      relations: { user: true },
    });
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
    const esGestion = userRole === UserRole.ADMIN || userRole === UserRole.SUPERVISOR;
    if (!esGestion) {
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
    if (esGestion && pqrs.estado === PqrsStatus.PENDIENTE) {
      if (isValidTransition(pqrs.estado, PqrsStatus.EN_PROCESO)) {
        pqrs.estado = PqrsStatus.EN_PROCESO;
        await this.pqrsRepository.save(pqrs);
        fueTransicionAutomatica = true;
      }
    }

    const respuesta = this.respuestaRepository.create({
      contenido: createRespuestaDto.contenido,
      esAdmin: esGestion,
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

    // Notificar al ciudadano solo cuando el admin responde
    if (esGestion && pqrs.user?.email) {
      this.emailService.sendNuevaRespuesta({
        to: pqrs.user.email,
        nombre: pqrs.user.nombre,
        pqrsId: pqrs.id,
        titulo: pqrs.titulo,
        tipo: pqrs.tipo,
        respuesta: fullRespuesta.contenido,
        autorNombre: actor.nombre,
        esAdmin: true,
        radicado: pqrs.radicado,
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
    if (adminRole && adminRole !== UserRole.ADMIN && adminRole !== UserRole.SUPERVISOR) {
      throw new ForbiddenException('Solo los administradores o funcionarios pueden cambiar el estado de una PQRS.');
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

    // Notificar al ciudadano sobre el cambio de estado
    if (pqrs.user?.email) {
      this.emailService.sendCambioEstado({
        to: pqrs.user.email,
        nombre: pqrs.user.nombre,
        pqrsId: id,
        titulo: pqrs.titulo,
        tipo: pqrs.tipo,
        estadoAnterior: currentStatus,
        estadoNuevo: newStatus,
        radicado: pqrs.radicado,
      });
    }

    return {
      id: updated.id,
      titulo: updated.titulo,
      descripcion: updated.descripcion,
      tipo: updated.tipo,
      estado: updated.estado,
      prioridad: updated.prioridad,
      fechaLimite: this.getSafeSlaDate(updated.createdAt, updated.prioridad),
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
    if (adminRole !== UserRole.ADMIN && adminRole !== UserRole.SUPERVISOR) {
      throw new ForbiddenException(
        'Solo los administradores o supervisores pueden cambiar la prioridad',
      );
    }

    const pqrs = await this.pqrsRepository.findOne({
      where: { id },
      relations: { user: true }
    });
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

    // Notificación Activa: Informar al ciudadano del cambio de prioridad
    if (pqrs.user?.email) {
      this.emailService.sendPrioridadCambiada({
        to: pqrs.user.email,
        nombre: pqrs.user.nombre,
        prioridadNueva: dto.prioridad,
        radicado: pqrs.radicado,
        pqrsId: id,
      });
    }

    return {
      id: updated.id,
      titulo: updated.titulo,
      descripcion: updated.descripcion,
      tipo: updated.tipo,
      estado: updated.estado,
      prioridad: updated.prioridad,
      fechaLimite: this.getSafeSlaDate(updated.createdAt, updated.prioridad),
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
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPERVISOR) {
      throw new ForbiddenException('No tienes permisos para consultar estadísticas.');
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

    // PQRS por área (Métricas de gestión)
    const porAreaRaw = await this.pqrsRepository
      .createQueryBuilder('p')
      .select('p.area', 'area')
      .addSelect('COUNT(*)', 'cantidad')
      .where('p.area IS NOT NULL')
      .groupBy('p.area')
      .getRawMany();

    // PQRS por prioridad
    const porPrioridad = {
      [PqrsPriority.BAJA]: await this.pqrsRepository.countBy({ prioridad: PqrsPriority.BAJA }),
      [PqrsPriority.MEDIA]: await this.pqrsRepository.countBy({ prioridad: PqrsPriority.MEDIA }),
      [PqrsPriority.ALTA]: await this.pqrsRepository.countBy({ prioridad: PqrsPriority.ALTA }),
      [PqrsPriority.URGENTE]: await this.pqrsRepository.countBy({ prioridad: PqrsPriority.URGENTE }),
    };

    // --- CÁLCULO DE CUMPLIMIENTO LEGAL (Ley 1755) ---
    const abiertas = await this.pqrsRepository.find({
      where: { estado: Not(In([PqrsStatus.RESUELTO, PqrsStatus.CERRADO])) },
      select: {
        id: true,
        createdAt: true,
        prioridad: true,
        tipo: true
      }
    });

    let vencidas = 0;
    let proximaVencer = 0; // Menos de 48 horas
    const ahora = new Date();

    abiertas.forEach(p => {
      const fechaLimite = calcularFechaLimiteLegal(p.createdAt, p.tipo);
      if (fechaLimite < ahora) {
        vencidas++;
      } else {
        const diffHoras = (fechaLimite.getTime() - ahora.getTime()) / (1000 * 60 * 60);
        if (diffHoras <= 48) proximaVencer++;
      }
    });

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
        // Validación defensiva: Si faltan fechas, no intentamos calcular el tiempo
        if (!(item.updatedAt instanceof Date) || !(item.createdAt instanceof Date)) {
          return sum;
        }
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
      porArea: porAreaRaw.map(r => ({ area: r.area, cantidad: Number(r.cantidad) })),
      porPrioridad,
      urgentesAbiertas,
      ultimosSieteDias,
      tiempoPromedioResolucion,
      cumplimiento: {
        vencidas,
        proximaVencer,
        abiertas: abiertas.length,
        eficiencia: abiertas.length > 0 ? Math.round(((abiertas.length - vencidas) / abiertas.length) * 100) : 100
      }
    };
  }

  /**
   * Estadísticas agregadas para el dashboard administrativo.
   */
  async getDashboardStats(): Promise<DashboardStatsDto> {
    // 1. Contadores por estado
    const contadores = await this.pqrsRepository
      .createQueryBuilder('p')
      .select('p.estado', 'estado')
      .addSelect('COUNT(*)', 'cantidad')
      .groupBy('p.estado')
      .getRawMany();

    // 2. Distribución por tipo
    const porTipoRaw = await this.pqrsRepository
      .createQueryBuilder('p')
      .select('p.tipo', 'tipo')
      .addSelect('COUNT(*)', 'cantidad')
      .groupBy('p.tipo')
      .getRawMany();

    // 3. Distribución por prioridad
    const porPrioridadRaw = await this.pqrsRepository
      .createQueryBuilder('p')
      .select('p.prioridad', 'prioridad')
      .addSelect('COUNT(*)', 'cantidad')
      .groupBy('p.prioridad')
      .getRawMany();

    // 4. Tiempo promedio de resolución (horas): createdAt → primer evento estado=resuelto
    const tiempoResolucionRaw = await this.historialRepo
      .createQueryBuilder('h')
      .innerJoin('h.pqrs', 'p')
      .select(
        `AVG(EXTRACT(EPOCH FROM (h.createdAt - p.createdAt)) / 3600)`,
        'promedio',
      )
      .where('h.tipoEvento = :tipo', { tipo: PqrsEventType.ESTADO_CAMBIADO })
      .andWhere(`h.detalle->>'estadoNuevo' = :estado`, { estado: PqrsStatus.RESUELTO })
      .getRawOne();

    // 5. Tiempo promedio de primera respuesta admin (horas)
    const tiempoRespuestaRaw = await this.historialRepo
      .createQueryBuilder('h')
      .innerJoin('h.pqrs', 'p')
      .select(
        `AVG(EXTRACT(EPOCH FROM (h.createdAt - p.createdAt)) / 3600)`,
        'promedio',
      )
      .where('h.tipoEvento = :tipo', { tipo: PqrsEventType.RESPUESTA_AGREGADA })
      .andWhere(`h.detalle->>'esAdmin' = 'true'`)
      .andWhere(`h."createdAt" = (
        SELECT MIN(h2."createdAt") FROM pqrs_historial h2
        WHERE h2."pqrsId" = h."pqrsId"
          AND h2."tipoEvento" = 'respuesta_agregada'
          AND h2.detalle->>'esAdmin' = 'true'
      )`)
      .getRawOne();

    // 6. Creadas por día (últimos 30 días)
    const creadasPorDiaRaw = await this.pqrsRepository
      .createQueryBuilder('p')
      .select(`DATE(p.createdAt)`, 'fecha')
      .addSelect('COUNT(*)', 'cantidad')
      .where(`p.createdAt >= NOW() - INTERVAL '30 days'`)
      .groupBy(`DATE(p.createdAt)`)
      .orderBy(`DATE(p.createdAt)`, 'ASC')
      .getRawMany();

    // 7. Resueltas por día (últimos 30 días) — primer evento de resolución por día
    const resueltasPorDiaRaw = await this.historialRepo
      .createQueryBuilder('h')
      .select(`DATE(h.createdAt)`, 'fecha')
      .addSelect('COUNT(*)', 'cantidad')
      .where('h.tipoEvento = :tipo', { tipo: PqrsEventType.ESTADO_CAMBIADO })
      .andWhere(`h.detalle->>'estadoNuevo' = :estado`, { estado: PqrsStatus.RESUELTO })
      .andWhere(`h.createdAt >= NOW() - INTERVAL '30 days'`)
      .groupBy(`DATE(h.createdAt)`)
      .orderBy(`DATE(h.createdAt)`, 'ASC')
      .getRawMany();

    // 8. Creadas en últimos 7 días
    const creadasUltimos7Dias = await this.pqrsRepository
      .createQueryBuilder('p')
      .where(`p.createdAt >= NOW() - INTERVAL '7 days'`)
      .getCount();

    // 9. PQRS en riesgo: activas sin cambio de estado en más de 5 días
    const pqrsEnRiesgo = await this.pqrsRepository
      .createQueryBuilder('p')
      .where(`p.estado NOT IN ('resuelto', 'cerrado')`)
      .andWhere(`p.updatedAt < NOW() - INTERVAL '5 days'`)
      .getCount();

    // 10. Totales y tasa
    const getCount = (estado: string) =>
      Number(contadores.find((c) => c.estado === estado)?.cantidad ?? 0);

    const totalPqrs = await this.pqrsRepository.count();
    const totalResueltas = getCount(PqrsStatus.RESUELTO);
    const tasaResolucion =
      totalPqrs > 0 ? Math.round((totalResueltas / totalPqrs) * 100) : 0;

    return {
      totalPqrs,
      totalPendientes: getCount(PqrsStatus.PENDIENTE),
      totalEnProceso: getCount(PqrsStatus.EN_PROCESO),
      totalResueltas,
      totalRechazadas: 0,
      totalCerradas: getCount(PqrsStatus.CERRADO),
      porTipo: porTipoRaw.map((r) => ({ tipo: r.tipo, cantidad: Number(r.cantidad) })),
      porPrioridad: porPrioridadRaw.map((r) => ({
        prioridad: r.prioridad,
        cantidad: Number(r.cantidad),
      })),
      tiempoPromedioResolucion: tiempoResolucionRaw?.promedio
        ? Math.round(Number(tiempoResolucionRaw.promedio) * 10) / 10
        : null,
      tiempoPromedioRespuesta: tiempoRespuestaRaw?.promedio
        ? Math.round(Number(tiempoRespuestaRaw.promedio) * 10) / 10
        : null,
      creadasPorDia: creadasPorDiaRaw.map((r) => ({
        fecha: r.fecha,
        cantidad: Number(r.cantidad),
      })),
      resueltasPorDia: resueltasPorDiaRaw.map((r) => ({
        fecha: r.fecha,
        cantidad: Number(r.cantidad),
      })),
      tasaResolucion,
      creadasUltimos7Dias,
      pqrsEnRiesgo,
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

  /**
   * Asigna una PQRS a un supervisor o área responsable.
   * Exclusivo para administradores.
   */
  async assignPqrs(
    id: string,
    assignDto: AssignPqrsDto,
    adminRole: string,
    adminActor?: { id: string; nombre: string },
  ): Promise<any> {
    if (adminRole !== UserRole.ADMIN && adminRole !== UserRole.SUPERVISOR) {
      throw new ForbiddenException('Solo los administradores o supervisores pueden asignar PQRS');
    }

    const pqrs = await this.pqrsRepository.findOne({
      where: { id },
      relations: { user: true, supervisorAsignado: true },
    });

    if (!pqrs) {
      throw new NotFoundException(`La PQRS con ID ${id} no existe.`);
    }

    if (pqrs.estado === PqrsStatus.CERRADO) {
      throw new BadRequestException('No se puede asignar una PQRS cerrada');
    }

    const supervisorAnterior = pqrs.supervisorAsignadoId;
    const areaAnterior = pqrs.area;

    // Actualizar asignaciones
    if (assignDto.supervisorAsignadoId) {
      pqrs.supervisorAsignadoId = assignDto.supervisorAsignadoId;
    }

    if (assignDto.area) {
      pqrs.area = assignDto.area;
    }

    const updated = await this.pqrsRepository.save(pqrs);

    const actor = adminActor ?? { id: 'system', nombre: 'Administrador' };
    await this.historialService.registrar({
      pqrsId: id,
      tipoEvento: PqrsEventType.ASIGNACION_CAMBIADA,
      actor,
      detalle: {
        supervisorAnterior,
        supervisorNuevo: assignDto.supervisorAsignadoId,
        areaAnterior,
        areaNueva: assignDto.area,
      },
      descripcion: `Asignación cambió: ${assignDto.supervisorAsignadoId ? `asignada a supervisor ${pqrs.supervisorAsignado?.nombre}` : 'sin asignar'} - Área: ${assignDto.area || 'sin especificar'}`,
    });

    // Notificar al supervisor asignado si es nuevo
    if (assignDto.supervisorAsignadoId && assignDto.supervisorAsignadoId !== supervisorAnterior) {
      if (updated.supervisorAsignado?.email) {
        this.emailService.sendPqrsAsignada({
          to: updated.supervisorAsignado.email,
          nombre: updated.supervisorAsignado.nombre,
          pqrsId: updated.id,
          titulo: updated.titulo,
          tipo: updated.tipo,
          area: updated.area || undefined,
          ciudadano: pqrs.user?.nombre,
        });
      }
    }

    // Notificación Activa: Informar al ciudadano que su PQRS ya tiene área/supervisor
    if (pqrs.user?.email && (assignDto.area || assignDto.supervisorAsignadoId)) {
      this.emailService.sendNotificacionAsignacionCiudadano({
        to: pqrs.user.email,
        nombre: pqrs.user.nombre,
        area: assignDto.area || 'Área Técnica',
        radicado: pqrs.radicado,
        pqrsId: id,
      });
    }

    return {
      id: updated.id,
      titulo: updated.titulo,
      descripcion: updated.descripcion,
      tipo: updated.tipo,
      estado: updated.estado,
      prioridad: updated.prioridad,
      area: updated.area,
      supervisorAsignado: updated.supervisorAsignado ? { id: updated.supervisorAsignado.id, nombre: updated.supervisorAsignado.nombre } : null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
