import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/entities/user.entity';

export async function seedUsers(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);

  const usersToSeed = [
    {
      nombre: 'Administrador Maestro',
      email: 'admin_master@gmail.com',
      password: 'Adm1n#2026',
      rol: UserRole.ADMIN,
    },
    {
      nombre: 'Supervisor PQRS',
      email: 'supervisor_pqrs@gmail.com',
      password: 'Sup3rPqrs!',
      rol: UserRole.SUPERVISOR,
    },
    {
      nombre: 'Cliente Portal',
      email: 'cliente_portal@gmail.com',
      password: 'Cl13nte$Web',
      rol: UserRole.USUARIO,
    },
  ];

  for (const userData of usersToSeed) {
    // Check if user already exists
    const existingUser = await userRepository.findOne({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log(`✓ Usuario ${userData.email} ya existe. Saltando...`);
      continue;
    }

    // Check if user exists with old email format (without @gmail.com)
    const oldEmail = userData.email.replace('@gmail.com', '');
    const userWithOldEmail = await userRepository.findOne({
      where: { email: oldEmail },
    });

    if (userWithOldEmail) {
      // Update email to new format
      userWithOldEmail.email = userData.email;
      await userRepository.save(userWithOldEmail);
      console.log(`✓ Usuario ${oldEmail} actualizado a ${userData.email}`);
      continue;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 12);

    // Create user
    const user = userRepository.create({
      nombre: userData.nombre,
      email: userData.email,
      passwordHash,
      rol: userData.rol,
      isActive: true,
    });

    await userRepository.save(user);
    console.log(`✓ Usuario ${userData.email} creado exitosamente con rol ${userData.rol}`);
  }

  console.log('✓ Seeding de usuarios completado.');
}
