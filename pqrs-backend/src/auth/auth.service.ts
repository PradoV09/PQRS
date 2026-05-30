import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async emailExiste(email: string): Promise<boolean> {
    const user = await this.usersService.findByEmail(email.toLowerCase().trim());
    return !!user;
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Este correo ya está registrado.');
    }

    const rounds = this.config.get<number>('BCRYPT_ROUNDS') ?? 12;
    const passwordHash = await bcrypt.hash(registerDto.password, rounds);

    const user = this.usersRepo.create({
      nombre: registerDto.nombre,
      email: registerDto.email.toLowerCase().trim(),
      passwordHash,
    });

    const saved = await this.usersRepo.save(user);

    const tokens = await this.generateTokens(saved);
    const hashRounds = 10;
    saved.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, hashRounds);
    await this.usersRepo.save(saved);

    return {
      user: saved.toJSON(),
      accessToken: tokens.accessToken,
    };
  }

  async login(email: string, password: string) {
    // Buscar con campos select:false incluidos
    const user = await this.usersRepo.findOne({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true, email: true, nombre: true, rol: true,
        passwordHash: true, refreshTokenHash: true,
        failedLoginAttempts: true, lockedUntil: true, isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Esta cuenta ha sido desactivada.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutos = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Cuenta bloqueada. Intenta de nuevo en ${minutos} minuto(s).`,
      );
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);

    if (!passwordOk) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.failedLoginAttempts = 0;
      }
      await this.usersRepo.save(user);
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;

    const tokens = await this.generateTokens(user);

    user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.usersRepo.save(user);

    return {
      user: user.toJSON(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string }> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado.');
    }

    const user = await this.usersRepo.findOne({
      where: { id: payload.sub },
      select: { id: true, email: true, nombre: true, rol: true, refreshTokenHash: true, isActive: true },
    });

    if (!user || !user.isActive || !user.refreshTokenHash) {
      throw new UnauthorizedException('Sesión no válida.');
    }

    const tokenOk = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!tokenOk) {
      throw new UnauthorizedException('Refresh token no coincide.');
    }

    const newPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    };
    return { accessToken: this.jwtService.sign(newPayload) };
  }

  async logout(userId: string): Promise<void> {
    await this.usersRepo.update(userId, { refreshTokenHash: null });
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as any,
    });

    return { accessToken, refreshToken };
  }
}
