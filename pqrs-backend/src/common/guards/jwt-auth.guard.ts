import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Asegurar que todas las respuestas (incluyendo errores 401) tengan el encabezado CORP
    // Esto evita el error net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin
    const response = context.switchToHttp().getResponse();
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  override handleRequest<TUser>(
    err: Error,
    user: TUser,
    info: { message?: string },
  ): TUser {
    if (err || !user) {
      console.error('[JwtAuthGuard] Fallo de autenticación:', info?.message || 'Token ausente');
      throw new UnauthorizedException(
        info?.message?.toLowerCase().includes('expired')
          ? 'La sesión ha expirado. Inicia sesión nuevamente.'
          : 'No autenticado. Se requiere un token válido.',
      );
    }
    return user;
  }
}
