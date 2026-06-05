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

  async sendWelcomeEmail(data: { nombre: string; email: string }) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
    const html = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a56db; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">¡Bienvenido al Sistema PQRS!</h1>
        </div>
        <div style="padding: 30px 20px;">
          <p>Estimado(a) <strong>${data.nombre}</strong>,</p>
          <p>Le damos la más cordial bienvenida a nuestro sistema de Peticiones, Quejas, Reclamos y Sugerencias.</p>
          <p>Su cuenta ha sido creada exitosamente. Ahora puede:</p>
          <ul style="list-style: none; padding: 0;">
            <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">✅ Crear nuevas solicitudes PQRS</li>
            <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">✅ Hacer seguimiento a sus trámites</li>
            <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">✅ Recibir notificaciones sobre sus solicitudes</li>
            <li style="padding: 10px 0;">✅ Gestionar su información personal</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}" style="display: inline-block; background: #1a56db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">Ingresar al Sistema</a>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Si tiene alguna pregunta o necesita asistencia, no dude en contactarnos.
          </p>
          <p style="font-size: 14px; color: #666;">
            Atentamente,<br>
            <strong>Equipo de Soporte PQRS</strong>
          </p>
        </div>
        <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>Este es un correo automático, por favor no responda.</p>
        </div>
      </div>
    `;
    return this.sendMail(data.email, '¡Bienvenido al Sistema PQRS!', html);
  }

  async sendPasswordChangeNotification(data: { nombre: string; email: string }) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
    const html = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Contraseña Modificada</h1>
        </div>
        <div style="padding: 30px 20px;">
          <p>Estimado(a) <strong>${data.nombre}</strong>,</p>
          <p>Le informamos que su contraseña ha sido modificada exitosamente.</p>
          <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
            <p style="margin: 0; color: #065f46;">Si usted realizó este cambio, puede ignorar este correo.</p>
          </div>
          <p style="color: #dc2626; font-weight: bold;">Si no realizó este cambio, por favor contacte inmediatamente a soporte para proteger su cuenta.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}" style="display: inline-block; background: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">Ingresar al Sistema</a>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Por seguridad, todas las sesiones activas han sido cerradas. Deberá iniciar sesión nuevamente.
          </p>
          <p style="font-size: 14px; color: #666;">
            Atentamente,<br>
            <strong>Equipo de Soporte PQRS</strong>
          </p>
        </div>
        <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>Este es un correo automático, por favor no responda.</p>
        </div>
      </div>
    `;
    return this.sendMail(data.email, 'Contraseña Modificada Exitosamente', html);
  }
}