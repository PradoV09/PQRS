import { Controller, Get, Patch, Post, Delete, Param, Body, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Patch(':id/status')
  toggleStatus(@Param('id') id: string): Promise<User> {
    return this.usersService.toggleStatus(id);
  }

  @Post()
  async create(
    @Body() body: { nombre: string; email: string; password: string; rol: string },
  ): Promise<User> {
    const { nombre, email, password, rol } = body;
    if (!nombre || !email || !password || !rol) {
      throw new BadRequestException('Missing required fields');
    }
    return this.usersService.createAdminUser(nombre, email, password, rol);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { nombre?: string; rol?: string },
  ): Promise<User> {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.delete(id);
  }
}
