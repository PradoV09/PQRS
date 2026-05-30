import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Req,
  HttpCode,
  HttpStatus,
  Query,
  Res,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Public } from '../common/decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { PqrsService } from './pqrs.service';
import { HistorialService } from './historial.service';
import { FilesService } from '../files/files.service';
import { CreatePqrsDto } from './dto/create-pqrs.dto';
import { CreateRespuestaDto } from './dto/create-respuesta.dto';
import { UpdatePqrsStatusDto } from './dto/update-pqrs-status.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { AssignPqrsDto } from './dto/assign-pqrs.dto';
import { PqrsQueryDto } from './dto/pqrs-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PqrsStatus } from '../common/enums/pqrs-status.enum';
import { multerOptions } from './config/multer.config';
import { FileTypeValidationPipe } from '../files/pipes/file-type-validation.pipe';
import { MAX_FILES_PER_PQRS } from '../common/constants/allowed-file-types';

@ApiTags('PQRS')
@ApiBearerAuth()
@Controller('pqrs')
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
export class PqrsController {
  constructor(
    private readonly pqrsService: PqrsService,
    private readonly historialService: HistorialService,
    private readonly filesService: FilesService,
  ) { }

  /**
   * Seguimiento público de PQRS por número de radicado.
   * No requiere autenticación.
   */
  @Public()
  @Get('track/:radicado')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consultar estado de una PQRS por número de radicado (Público)' })
  @ApiResponse({ status: 200, description: 'Estado de la PQRS recuperado.' })
  @ApiResponse({ status: 404, description: 'Radicado no encontrado.' })
  async trackByRadicado(@Param('radicado') radicado: string) {
    return this.pqrsService.trackByRadicado(radicado);
  }

  /**
   * Crear una nueva PQRS. Soporta subida de hasta 5 archivos adjuntos.
   * Rate limit: Máximo 5 peticiones por minuto por usuario.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseInterceptors(FilesInterceptor('files', MAX_FILES_PER_PQRS, multerOptions()))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Crear una nueva PQRS con archivos adjuntos' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        titulo: { type: 'string', minLength: 5, maxLength: 200 },
        descripcion: { type: 'string', minLength: 10 },
        tipo: { type: 'string', enum: ['peticion', 'queja', 'reclamo', 'sugerencia'] },
        prioridad: { type: 'string', enum: ['baja', 'media', 'alta', 'urgente'], default: 'media' },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Archivos adjuntos — solo PDF, JPG, PNG, DOCX · máx 5 · 10 MB c/u',
        },
      },
      required: ['titulo', 'descripcion', 'tipo'],
    },
  })
  @ApiResponse({ status: 201, description: 'PQRS creada exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o archivos no permitidos.' })
  @ApiResponse({ status: 415, description: 'Tipo de archivo no permitido o firma binaria inválida.' })
  @ApiResponse({ status: 429, description: 'Demasiadas solicitudes. Límite de 5 por minuto.' })
  async create(
    @Body() createPqrsDto: CreatePqrsDto,
    @Req() req: any,
    @UploadedFiles(new FileTypeValidationPipe()) files: Express.Multer.File[],
  ) {
    const userId = req.user.id;
    const actor = { id: req.user.id, nombre: req.user.nombre, email: req.user.email };
    return this.pqrsService.create(createPqrsDto, userId, files, actor);
  }

  /**
   * Obtener estadísticas generales (Solo Administrador).
   */
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener estadísticas generales de PQRS (Admin y Funcionarios)' })
  @ApiResponse({ status: 200, description: 'Estadísticas recuperadas exitosamente.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado.' })
  async getStats(@Req() req: any) {
    const userRole = req.user.rol ?? req.user.role;
    return this.pqrsService.getStats(userRole);
  }

  /**
   * Listar PQRS con paginación, búsquedas, ordenamientos y filtros.
   * Usuarios normales ven las suyas, administradores ven todas o filtran por usuario.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener listado de PQRS (paginado, filtrado y ordenado)' })
  @ApiQuery({ name: 'prioridad', required: false, enum: ['baja', 'media', 'alta', 'urgente'], description: 'Filtrar por nivel de prioridad' })
  @ApiResponse({ status: 200, description: 'Listado recuperado exitosamente.' })
  async findAll(@Query() queryDto: PqrsQueryDto, @Req() req: any) {
    const userId = req.user.id;
    const userRole = req.user.rol ?? req.user.role;
    try {
      return await this.pqrsService.findAll(queryDto, userId, userRole);
    } catch (error) {
      console.error(' [DEBUG] Error real detectado en PqrsController.findAll:', error);
      throw error; // Re-lanzamos para que siga su flujo normal, pero ya lo logueamos
    }
  }

  /**
   * Obtener historial de trazabilidad de una PQRS.
   */
  @Get(':id/historial')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener historial de trazabilidad de una PQRS' })
  @ApiResponse({ status: 200, description: 'Historial recuperado exitosamente.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado.' })
  @ApiResponse({ status: 404, description: 'PQRS no encontrada.' })
  async getHistorial(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    const userRole = req.user.rol ?? req.user.role;
    await this.pqrsService.findOne(id, userId, userRole);
    return this.historialService.obtenerPorPqrs(id, userRole);
  }

  /**
   * Ver el detalle de una PQRS específica con sus respuestas.
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener detalle de una PQRS con sus respuestas' })
  @ApiResponse({ status: 200, description: 'Detalle recuperado exitosamente.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado.' })
  @ApiResponse({ status: 404, description: 'PQRS no encontrada.' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    const userRole = req.user.rol ?? req.user.role;
    return this.pqrsService.findOne(id, userId, userRole);
  }

  /**
   * Registrar una respuesta a una PQRS.
   */
  @Post(':id/respuestas')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Responder a una PQRS' })
  @ApiResponse({ status: 201, description: 'Respuesta registrada exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o estado de PQRS no permite respuesta.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado.' })
  @ApiResponse({ status: 404, description: 'PQRS no encontrada.' })
  async createRespuesta(
    @Param('id') id: string,
    @Body() createRespuestaDto: CreateRespuestaDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    const userRole = req.user.rol ?? req.user.role;
    return this.pqrsService.createRespuesta(id, createRespuestaDto, userId, userRole);
  }

  /**
   * Agregar más archivos a un PQRS existente (estado no cerrado).
   * Solo el dueño o admin pueden adjuntar más archivos.
   */
  @Post(':id/attachments')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  @UseInterceptors(FilesInterceptor('files', MAX_FILES_PER_PQRS, multerOptions()))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Agregar archivos adicionales a una PQRS (PDF, JPG, PNG, DOCX)' })
  @ApiResponse({ status: 201, description: 'Archivos agregados exitosamente.' })
  @ApiResponse({ status: 400, description: 'PQRS cerrada, archivos no permitidos o límite superado.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado.' })
  @ApiResponse({ status: 404, description: 'PQRS no encontrada.' })
  @ApiResponse({ status: 415, description: 'Tipo de archivo no permitido o firma binaria inválida.' })
  async addAttachments(
    @Param('id') id: string,
    @Req() req: any,
    @UploadedFiles(new FileTypeValidationPipe()) files: Express.Multer.File[],
  ) {
    const userId = req.user.id;
    const userRole = req.user.rol ?? req.user.role;

    const pqrs = await this.pqrsService.findOne(id, userId, userRole);

    if (pqrs.estado === PqrsStatus.CERRADO) {
      throw new BadRequestException('No se pueden agregar archivos a una PQRS cerrada');
    }

    const isOwner = pqrs.userId === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new BadRequestException('Solo el dueño o admin pueden agregar archivos');
    }

    const attachments = await this.filesService.saveAttachments(id, files, {
      id: req.user.id,
      nombre: req.user.nombre,
      rol: userRole,
    });
    return this.pqrsService.findOne(id, userId, userRole);
  }

  /**
   * Actualizar el estado de una PQRS (Solo Administrador).
   * Respeta la máquina de estados.
   */
  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar el estado de una PQRS (Solo Admin)' })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Transición de estado inválida.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado (no es administrador).' })
  @ApiResponse({ status: 404, description: 'PQRS no encontrada.' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdatePqrsStatusDto,
    @Req() req: any,
  ) {
    const adminUserId = req.user.id;
    const adminRole = req.user.rol ?? req.user.role;
    const adminActor = { id: req.user.id, nombre: req.user.nombre };
    return this.pqrsService.updateStatus(id, updateStatusDto, adminUserId, adminRole, adminActor);
  }

  /**
   * Actualizar la prioridad de una PQRS (Solo Administrador).
   */
  @Patch(':id/priority')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar la prioridad de una PQRS (Solo Admin)' })
  @ApiResponse({ status: 200, description: 'Prioridad actualizada exitosamente.' })
  @ApiResponse({ status: 400, description: 'PQRS cerrada — no se puede cambiar la prioridad.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado (no es administrador).' })
  @ApiResponse({ status: 404, description: 'PQRS no encontrada.' })
  async updatePriority(
    @Param('id') id: string,
    @Body() updatePriorityDto: UpdatePriorityDto,
    @Req() req: any,
  ) {
    const adminRole = req.user.rol ?? req.user.role;
    const adminActor = { id: req.user.id, nombre: req.user.nombre };
    return this.pqrsService.updatePriority(id, updatePriorityDto, adminRole, adminActor);
  }

  /**
   * Eliminar una PQRS (Dueño o Administrador).
   * Borra también los archivos adjuntos asociados del disco.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una PQRS' })
  @ApiResponse({ status: 204, description: 'PQRS eliminada exitosamente.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado.' })
  @ApiResponse({ status: 404, description: 'PQRS no encontrada.' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    const userRole = req.user.rol ?? req.user.role;
    const actor = { id: req.user.id, nombre: req.user.nombre };
    return this.pqrsService.remove(id, userId, userRole, actor);
  }

  /**
   * Descarga segura de un archivo adjunto.
   * Valida que el solicitante sea el creador de la PQRS o administrador.
   */
  @Get(':id/attachments/:attId/download')
  @ApiOperation({ summary: 'Descargar un archivo adjunto de forma segura' })
  @ApiResponse({ status: 200, description: 'Archivo enviado exitosamente.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado.' })
  @ApiResponse({ status: 404, description: 'PQRS o archivo no encontrado.' })
  async downloadAttachment(
    @Param('id') id: string,
    @Param('attId') attId: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userId = req.user.id;
    const userRole = req.user.rol ?? req.user.role;

    const { absolutePath, filename, mimetype } =
      await this.pqrsService.getAttachmentPath(id, attId, userId, userRole);

    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    // Configurar cabeceras de respuesta seguras para descarga
    res.setHeader('Content-Type', mimetype);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );

    return res.sendFile(absolutePath);
  }

  /**
   * Asignar una PQRS a un supervisor o área responsable.
   * Solo Administrador puede asignar.
   */
  @Patch(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Asignar una PQRS a un supervisor o área responsable' })
  @ApiResponse({ status: 200, description: 'PQRS asignada exitosamente.' })
  @ApiResponse({ status: 400, description: 'PQRS cerrada o datos inválidos.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado (no es administrador).' })
  @ApiResponse({ status: 404, description: 'PQRS no encontrada.' })
  async assignPqrs(
    @Param('id') id: string,
    @Body() assignDto: AssignPqrsDto,
    @Req() req: any,
  ) {
    const adminRole = req.user.rol ?? req.user.role;
    const adminActor = { id: req.user.id, nombre: req.user.nombre };
    return this.pqrsService.assignPqrs(id, assignDto, adminRole, adminActor);
  }
}
