import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the root .env file of the backend
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'pqrs_user',
  password: process.env.DB_PASSWORD || 'pqrs_pass',
  database: process.env.DB_NAME || 'pqrs',
  entities: [path.join(__dirname, '../**/*.entity.{js,ts}')],
  migrations: [path.join(__dirname, './migrations/*.{js,ts}')],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
});
