import { Controller, Get, Delete, Param, Query, Res, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) { }

  @Get(':storedName')
  async serveFile(
    @Param('storedName') storedName: string,
    @Query('download') download: string,
    @Res() res: Response,
    @Req() req: any,
  ): Promise<void> {
    const asDownload = download === 'true';
    const user = { id: req.user.id, rol: req.user.rol };
    await this.filesService.serveFile(storedName, user, res, asDownload);
  }

  @Get('thumb/:thumbName')
  async serveThumb(
    @Param('thumbName') thumbName: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.filesService.serveThumb(thumbName, res);
  }

  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttachment(
    @Param('attachmentId') attachmentId: string,
    @Req() req: any,
  ): Promise<void> {
    const user = { id: req.user.id, rol: req.user.rol, nombre: req.user.nombre };
    await this.filesService.deleteAttachment(attachmentId, user);
  }
}
