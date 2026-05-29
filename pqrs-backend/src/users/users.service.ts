import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { RegisterDto } from '../auth/dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email: email.toLowerCase().trim() } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async create(registerDto: RegisterDto): Promise<User> {
    const { nombre, email, password } = registerDto;

    // Hash the password with 12 bcrypt salt rounds as requested
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      nombre,
      email: email.toLowerCase().trim(),
      passwordHash,
    });

    return this.userRepository.save(user);
  }

  async createAdminUser(nombre: string, email: string, password: string, rol: string): Promise<User> {
    // Hash the password with 12 bcrypt salt rounds as requested
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      nombre,
      email: email.toLowerCase().trim(),
      passwordHash,
      rol: rol as any,
    });

    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async toggleStatus(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }
    user.isActive = !user.isActive;
    return this.userRepository.save(user);
  }

  async update(id: string, data: { nombre?: string; rol?: string }): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }
    if (data.nombre) user.nombre = data.nombre;
    if (data.rol) user.rol = data.rol as any;
    return this.userRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }
    await this.userRepository.remove(user);
  }
}
