import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PqrsAttachment } from '../pqrs/entities/pqrs-attachment.entity';
import { Pqrs } from '../pqrs/entities/pqrs.entity';
import { HistorialService } from '../pqrs/historial.service';
import { PqrsEventType } from '../common/enums/pqrs-event-type.enum';
import { Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { THUMB_DEST, IMAGE_MIME_TYPES } from '../common/constants/upload.constants';

export interface FileActor {
  id: string;
  nombre: string;
  rol: string;
}

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(PqrsAttachment)
    private readonly attachmentRepository: Repository<PqrsAttachment>,
    @InjectRepository(Pqrs)
    private readonly pqrsRepository: Repository<Pqrs>,
    @Inject(forwardRef(() => HistorialService))
    private readonly historialService: HistorialService,
  ) { }

  async saveAttachments(
    pqrsId: string,
    files: Express.Multer.File[],
    actor?: FileActor | null,
  ): Promise<PqrsAttachment[]> {
    const attachments: PqrsAttachment[] = [];

    for (const file of files) {
      const attachment = this.attachmentRepository.create({
        filename: path.basename(file.originalname),
        storedName: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        path: `uploads/pqrs/${file.filename}`,
        pqrsId,
      });

      if (IMAGE_MIME_TYPES.includes(file.mimetype)) {
        try {
          const thumbName = `${uuidv4()}.webp`;
          const thumbPath = path.join(THUMB_DEST, thumbName);

          await sharp(file.path)
            .resize(128, 128, { fit: 'cover' })
            .webp({ quality: 70 })
            .toFile(thumbPath);

          attachment.thumbPath = `uploads/pqrs/thumbs/${thumbName}`;
        } catch (error) {
          console.error(`Error generating thumbnail for ${file.filename}:`, error);
        }
      }

      const saved = await this.attachmentRepository.save(attachment);
      attachments.push(saved);

      if (actor) {
        await this.historialService.registrar({
          pqrsId,
          tipoEvento: PqrsEventType.ARCHIVO_SUBIDO,
          actor: { id: actor.id, nombre: actor.nombre },
          detalle: {
            attachmentId: saved.id,
            filename: saved.filename,
            mimetype: saved.mimetype,
            sizeBytes: saved.size,
          },
          descripcion: `${actor.nombre} subió el archivo "${saved.filename}"`,
        });
      }
    }

    return attachments;
  }

  async deleteAttachment(
    attachmentId: string,
    requestUser: FileActor,
  ): Promise<void> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId },
      relations: ['pqrs'] as any,
    });

    if (!attachment) {
      throw new NotFoundException('Attachment no encontrado');
    }

    const isOwner = attachment.pqrs.userId === requestUser.id;
    const isAdmin = requestUser.rol === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('No tienes permiso para eliminar este archivo');
    }

    await this.historialService.registrar({
      pqrsId: attachment.pqrsId,
      tipoEvento: PqrsEventType.ARCHIVO_ELIMINADO,
      actor: { id: requestUser.id, nombre: requestUser.nombre },
      detalle: {
        attachmentId: attachment.id,
        filename: attachment.filename,
      },
      descripcion: `${requestUser.nombre} eliminó el archivo "${attachment.filename}"`,
    });

    try {
      const absolutePath = path.join(process.cwd(), attachment.path);
      await fs.unlink(absolutePath);
    } catch (error) {
      console.warn(`File not found on disk: ${attachment.path}`);
    }

    if (attachment.thumbPath) {
      try {
        const absoluteThumbPath = path.join(process.cwd(), attachment.thumbPath);
        await fs.unlink(absoluteThumbPath);
      } catch (error) {
        console.warn(`Thumbnail not found on disk: ${attachment.thumbPath}`);
      }
    }

    await this.attachmentRepository.delete(attachmentId);
  }

  async serveFile(
    storedName: string,
    requestUser: { id: string; rol: string },
    res: Response,
    asDownload = false,
  ): Promise<void> {
    const attachment = await this.attachmentRepository.findOne({
      where: { storedName },
      relations: ['pqrs'] as any,
    });

    if (!attachment) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const isOwner = attachment.pqrs.userId === requestUser.id;
    const isAdmin = requestUser.rol === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('No tienes permiso para acceder a este archivo');
    }

    const absolutePath = path.join(process.cwd(), attachment.path);

    try {
      await fs.access(absolutePath);
    } catch {
      throw new NotFoundException('Archivo no encontrado en disco');
    }

    res.setHeader('Content-Type', attachment.mimetype);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (asDownload) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
      );
    } else {
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(attachment.filename)}"`,
      );
    }

    res.sendFile(absolutePath);
  }

  async serveThumb(storedThumbName: string, res: Response): Promise<void> {
    const thumbPath = path.join(process.cwd(), 'uploads/pqrs/thumbs', storedThumbName);

    try {
      await fs.access(thumbPath);
    } catch {
      throw new NotFoundException('Thumbnail no encontrado');
    }

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(thumbPath);
  }
}
