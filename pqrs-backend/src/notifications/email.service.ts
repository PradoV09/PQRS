import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_SERVER'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false,
      tls: {
        rejectUnauthorized: false,
      },
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });

    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('Error verificando transporter SMTP:', error);
      } else {
        this.logger.log('Transporter SMTP verificado exitosamente');
      }
    });
  }

  private getPortalUrl(pqrsId?: string): string {
    const base = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
    return pqrsId ? `${base}/pqrs/${pqrsId}` : base;
  }

  private async sendMail(to: string, subject: string, html: string) {
    try {
      const from = this.configService.get<string>('EMAIL_USER');
      this.logger.log(`Intentando enviar correo a ${to} desde ${from}`);
      
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });

      this.logger.log(`Correo enviado exitosamente a ${to}. ID: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Excepción en sendMail para ${to}:`, error);
      if (error instanceof Error) {
        this.logger.error(`Error message: ${error.message}`);
        this.logger.error(`Error stack: ${error.stack}`);
      }
    }
  }

  async sendPqrsCreada(data: any) {
    const link = this.getPortalUrl(data.pqrsId);
    const html = `
      <div style="font-family: sans-serif; color: #333;">
        <h1 style="color: #1a56db;">Confirmación de Radicado</h1>
        <p>Estimado(a) <strong>${data.nombre}</strong>, su solicitud ha sido recibida exitosamente por nuestra entidad.</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Número de Radicado:</strong> ${data.radicado}</p>
          <p style="margin: 5px 0;"><strong>Asunto:</strong> ${data.titulo}</p>
          <p style="margin: 5px 0;"><strong>Tipo:</strong> ${data.tipo.toUpperCase()}</p>
        </div>
        <p>Puede consultar el progreso de su trámite haciendo clic en el siguiente botón:</p>
        <a href="${link}" style="display: inline-block; background: #1a56db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver mi PQRS</a>
      </div>
    `;
    return this.sendMail(data.to, `Nuevo Radicado Generado: ${data.radicado}`, html);
  }

  async sendCambioEstado(data: any) {
    const link = this.getPortalUrl(data.pqrsId);
    const html = `
      <div style="font-family: sans-serif; color: #333;">
        <h2 style="color: #1a56db;">Actualización de su Trámite</h2>
        <p>Hola ${data.nombre}, le informamos que su PQRS con radicado <strong>${data.radicado || 'N/A'}</strong> ha sido actualizada.</p>
        <p><strong>Nuevo Estado:</strong> <span style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${data.estadoNuevo.toUpperCase()}</span></p>
        <p>Consulte los detalles y trazabilidad aquí:</p>
        <a href="${link}" style="display: inline-block; background: #1a56db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Detalles</a>
      </div>
    `;
    return this.sendMail(data.to, `Actualización de Estado: ${data.radicado}`, html);
  }

  async sendNuevaRespuesta(data: any) {
    const link = this.getPortalUrl(data.pqrsId);
    const html = `
      <div style="font-family: sans-serif; color: #333;">
        <h2 style="color: #1a56db;">Nueva Respuesta Oficial</h2>
        <p>Estimado(a) ${data.nombre}, un funcionario ha emitido una respuesta a su radicado <strong>${data.radicado || ''}</strong>.</p>
        <div style="background: #f9fafb; padding: 15px; border-left: 4px solid #1a56db; font-style: italic;">
          ${data.respuesta}
        </div>
        <p style="margin-top: 20px;">Puede responder o ver adjuntos en el portal:</p>
        <a href="${link}" style="display: inline-block; background: #1a56db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Acceder al Hilo de Conversación</a>
        <p style="font-size: 0.8em; color: #666; margin-top: 30px;">Atentamente,<br><strong>${data.autorNombre}</strong></p>
      </div>
    `;
    return this.sendMail(data.to, `Respuesta oficial a su PQRS: ${data.radicado}`, html);
  }

  async sendPqrsAsignada(data: any) {
    const link = this.getPortalUrl(data.pqrsId);
    const html = `
      <div style="font-family: sans-serif; color: #333;">
        <h2 style="color: #d97706;">Asignación de Trámite</h2>
        <p>Hola ${data.nombre}, se le ha asignado una nueva solicitud para su gestión y respuesta oficial.</p>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Radicado:</strong> ${data.radicado || 'N/A'}</li>
          <li><strong>Tipo:</strong> ${data.tipo.toUpperCase()}</li>
          <li><strong>Ciudadano:</strong> ${data.ciudadano}</li>
        </ul>
        <a href="${link}" style="display: inline-block; background: #d97706; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Gestionar en Panel de Control</a>
      </div>
    `;
    return this.sendMail(data.to, `Asignación de PQRS: ${data.radicado}`, html);
  }

  async sendPrioridadCambiada(data: any) {
    const link = this.getPortalUrl(data.pqrsId);
    const html = `
      <div style="font-family: sans-serif; color: #333;">
        <h2 style="color: #1a56db;">Actualización de Prioridad</h2>
        <p>Hola ${data.nombre}, le informamos que la prioridad de su solicitud <strong>${data.radicado || ''}</strong> ha sido ajustada.</p>
        <p><strong>Nueva Prioridad:</strong> <span style="color: #dc2626; font-weight: bold;">${data.prioridadNueva.toUpperCase()}</span></p>
        <p>Este ajuste garantiza el cumplimiento de los términos de la Ley 1755 de 2015.</p>
        <a href="${link}" style="display: inline-block; background: #1a56db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver mi Radicado</a>
      </div>
    `;
    return this.sendMail(data.to, `Cambio de prioridad en su solicitud`, html);
  }

  async sendNotificacionAsignacionCiudadano(data: any) {
    const link = this.getPortalUrl(data.pqrsId);
    const html = `
      <div style="font-family: sans-serif; color: #333;">
        <h2 style="color: #1a56db;">Área Responsable Asignada</h2>
        <p>Estimado(a) ${data.nombre}, le informamos que su solicitud <strong>${data.radicado || ''}</strong> ha sido remitida al área de <strong>${data.area}</strong> para su trámite oficial.</p>
        <p>Un funcionario especializado se encuentra revisando los antecedentes de su caso.</p>
        <a href="${link}" style="display: inline-block; background: #1a56db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Seguimiento de Radicado</a>
      </div>
    `;
    return this.sendMail(data.to, `Asignación de Área: ${data.radicado}`, html);
  }
}