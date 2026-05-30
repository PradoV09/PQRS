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
      throw new UnauthorizedException(
        info?.message === 'jwt expired'
          ? 'La sesión ha expirado. Inicia sesión nuevamente.'
          : 'No autenticado. Se requiere un token válido.',
      );
    }
    return user;
  }
}
