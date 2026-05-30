import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { PqrsStatus } from '../common/enums/pqrs-status.enum';
import { PqrsType } from '../common/enums/pqrs-type.enum';

const TYPE_LABELS: Record<PqrsType, string> = {
  [PqrsType.PETICION]:   'Petición',
  [PqrsType.QUEJA]:      'Queja',
  [PqrsType.RECLAMO]:    'Reclamo',
  [PqrsType.SUGERENCIA]: 'Sugerencia',
};

const STATUS_LABELS: Record<PqrsStatus, string> = {
  [PqrsStatus.PENDIENTE]:   'Pendiente',
  [PqrsStatus.EN_PROCESO]:  'En proceso',
  [PqrsStatus.RESUELTO]:    'Resuelto',
  [PqrsStatus.CERRADO]:     'Cerrado',
};

const STATUS_COLOR: Record<PqrsStatus, string> = {
  [PqrsStatus.PENDIENTE]:  '#d97706',
  [PqrsStatus.EN_PROCESO]: '#1d4ed8',
  [PqrsStatus.RESUELTO]:   '#16a34a',
  [PqrsStatus.CERRADO]:    '#475569',
};

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly from = 'PQRS Sistema <onboarding@resend.dev>';
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(config.get<string>('RESEND_API_KEY'));
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:4200');
  }

  async sendPqrsCreada(opts: {
    to: string;
    nombre: string;
    pqrsId: string;
    titulo: string;
    tipo: PqrsType;
    radicado?: string;
  }): Promise<void> {
    const detailUrl = `${this.frontendUrl}/pqrs/${opts.pqrsId}`;

    await this.send({
      to: opts.to,
      subject: `✅ Tu solicitud fue registrada — ${TYPE_LABELS[opts.tipo]}`,
      html: this.baseTemplate({
        titulo: 'Solicitud Registrada Exitosamente',
        preheader: `Tu ${TYPE_LABELS[opts.tipo].toLowerCase()} fue recibida y está siendo atendida.`,
        body: `
          <p style="margin:0 0 16px">Hola <strong>${opts.nombre}</strong>,</p>
          <p style="margin:0 0 16px">
            Tu solicitud de tipo <strong>${TYPE_LABELS[opts.tipo]}</strong> ha sido registrada
            correctamente en nuestro sistema.
          </p>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:0 0 24px">
            <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:600">
              Detalle de la solicitud
            </p>
            <p style="margin:0 0 6px"><strong>Asunto:</strong> ${opts.titulo}</p>
            <p style="margin:0 0 6px"><strong>Tipo:</strong> ${TYPE_LABELS[opts.tipo]}</p>
            <p style="margin:0"><strong>Estado:</strong>
              <span style="color:#d97706;font-weight:600">Pendiente</span>
            </p>
          </div>

          <p style="margin:0 0 24px;color:#475569;font-size:14px">
            Puedes consultar el estado de tu solicitud en cualquier momento
            desde el portal ciudadano.
          </p>
        `,
        ctaLabel: 'Ver mi solicitud',
        ctaUrl: detailUrl,
      }),
    });
  }

  async sendNuevaRespuesta(opts: {
    to: string;
    nombre: string;
    pqrsId: string;
    titulo: string;
    tipo: PqrsType;
    respuesta: string;
    autorNombre: string;
    esAdmin: boolean;
  }): Promise<void> {
    const detailUrl = `${this.frontendUrl}/pqrs/${opts.pqrsId}`;
    const extracto = opts.respuesta.length > 200
      ? opts.respuesta.slice(0, 200) + '…'
      : opts.respuesta;

    await this.send({
      to: opts.to,
      subject: `💬 Nueva respuesta en tu solicitud — ${opts.titulo}`,
      html: this.baseTemplate({
        titulo: 'Tienes una Nueva Respuesta',
        preheader: `${opts.esAdmin ? 'Un funcionario' : opts.autorNombre} respondió tu solicitud.`,
        body: `
          <p style="margin:0 0 16px">Hola <strong>${opts.nombre}</strong>,</p>
          <p style="margin:0 0 16px">
            ${opts.esAdmin ? 'Un funcionario de nuestra entidad' : `<strong>${opts.autorNombre}</strong>`}
            ha registrado una respuesta en tu solicitud
            <strong>"${opts.titulo}"</strong>.
          </p>

          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #1d4ed8;border-radius:0 12px 12px 0;padding:16px 20px;margin:0 0 24px">
            <p style="margin:0 0 8px;font-size:12px;color:#1d4ed8;text-transform:uppercase;letter-spacing:.05em;font-weight:700">
              Respuesta
            </p>
            <p style="margin:0;color:#1e3a8a;line-height:1.6">${extracto}</p>
          </div>

          <p style="margin:0 0 24px;color:#475569;font-size:14px">
            Ingresa al portal para ver la respuesta completa y, si lo deseas,
            agregar un comentario adicional.
          </p>
        `,
        ctaLabel: 'Ver respuesta completa',
        ctaUrl: detailUrl,
      }),
    });
  }

  async sendCambioEstado(opts: {
    to: string;
    nombre: string;
    pqrsId: string;
    titulo: string;
    tipo: PqrsType;
    estadoAnterior: PqrsStatus;
    estadoNuevo: PqrsStatus;
  }): Promise<void> {
    const detailUrl = `${this.frontendUrl}/pqrs/${opts.pqrsId}`;
    const color = STATUS_COLOR[opts.estadoNuevo];
    const esResuelto = opts.estadoNuevo === PqrsStatus.RESUELTO;
    const esCerrado  = opts.estadoNuevo === PqrsStatus.CERRADO;

    await this.send({
      to: opts.to,
      subject: `🔔 Estado actualizado: ${STATUS_LABELS[opts.estadoNuevo]} — ${opts.titulo}`,
      html: this.baseTemplate({
        titulo: 'Estado de tu Solicitud Actualizado',
        preheader: `Tu solicitud pasó a estado "${STATUS_LABELS[opts.estadoNuevo]}".`,
        body: `
          <p style="margin:0 0 16px">Hola <strong>${opts.nombre}</strong>,</p>
          <p style="margin:0 0 16px">
            El estado de tu solicitud <strong>"${opts.titulo}"</strong> ha sido actualizado.
          </p>

          <div style="display:flex;align-items:center;gap:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:0 0 24px">
            <div style="text-align:center;flex:1">
              <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Anterior</p>
              <span style="display:inline-block;padding:4px 12px;border-radius:9999px;font-size:13px;font-weight:600;background:#f1f5f9;color:#475569">
                ${STATUS_LABELS[opts.estadoAnterior]}
              </span>
            </div>
            <div style="font-size:20px;color:#94a3b8">→</div>
            <div style="text-align:center;flex:1">
              <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Nuevo</p>
              <span style="display:inline-block;padding:4px 12px;border-radius:9999px;font-size:13px;font-weight:700;background:${color}1a;color:${color}">
                ${STATUS_LABELS[opts.estadoNuevo]}
              </span>
            </div>
          </div>

          ${esResuelto ? `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin:0 0 24px">
            <p style="margin:0;color:#15803d;font-weight:600">
              🎉 ¡Tu solicitud ha sido resuelta! Ingresa al portal para revisar la respuesta oficial.
            </p>
          </div>` : ''}

          ${esCerrado ? `
          <div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin:0 0 24px">
            <p style="margin:0;color:#475569">
              Esta solicitud ha sido cerrada. Si necesitas más ayuda, puedes crear una nueva solicitud.
            </p>
          </div>` : ''}
        `,
        ctaLabel: 'Ver solicitud',
        ctaUrl: detailUrl,
      }),
    });
  }

  private async send(opts: { to: string; subject: string; html: string }): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to:   opts.to,
        subject: opts.subject,
        html: opts.html,
      });

      if (error) {
        this.logger.warn(`Email no enviado a ${opts.to}: ${error.message}`);
      } else {
        this.logger.log(`Email enviado a ${opts.to}: "${opts.subject}"`);
      }
    } catch (err) {
      this.logger.error(`Error enviando email a ${opts.to}`, err);
    }
  }

  private baseTemplate(opts: {
    titulo: string;
    preheader: string;
    body: string;
    ctaLabel: string;
    ctaUrl: string;
  }): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${opts.titulo}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',Arial,sans-serif;color:#0f172a">
  <!-- Preheader invisible -->
  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all">${opts.preheader}</span>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

          <!-- Header -->
          <tr>
            <td style="background:#16a34a;border-radius:16px 16px 0 0;padding:28px 40px;text-align:center">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.02em">
                Sistema PQRS
              </h1>
              <p style="margin:4px 0 0;color:#bbf7d0;font-size:13px">
                Gestión de Peticiones, Quejas, Reclamos y Sugerencias
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 40px">
              <h2 style="margin:0 0 20px;font-size:20px;font-weight:800;color:#0f172a;letter-spacing:-0.02em">
                ${opts.titulo}
              </h2>

              ${opts.body}

              <!-- CTA Button -->
              <div style="text-align:center;margin:8px 0 0">
                <a href="${opts.ctaUrl}"
                   style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px">
                  ${opts.ctaLabel}
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f1f5f9;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center">
              <p style="margin:0 0 6px;font-size:12px;color:#64748b">
                Este correo fue enviado automáticamente por el Sistema PQRS.
                Por favor no respondas directamente a este mensaje.
              </p>
              <p style="margin:0;font-size:12px;color:#94a3b8">
                Si tienes dudas, accede al portal en
                <a href="${this.frontendUrl}" style="color:#16a34a;text-decoration:none">${this.frontendUrl}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
