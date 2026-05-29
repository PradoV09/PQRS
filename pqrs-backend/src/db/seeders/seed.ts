import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import { seedUsers } from './user.seeder';

async function runSeeders() {
  try {
    console.log('🌱 Iniciando seeders...');
    
    // Initialize DataSource
    await AppDataSource.initialize();
    console.log('✓ Conexión a base de datos establecida');

    // Run user seeder
    await seedUsers(AppDataSource);

    // Close connection
    await AppDataSource.destroy();
    console.log('✓ Conexión cerrada');
    console.log('🎉 Seeders completados exitosamente');
  } catch (error) {
    console.error('❌ Error ejecutando seeders:', error);
    process.exit(1);
  }
}

runSeeders();
