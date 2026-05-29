import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Pqrs } from './pqrs.entity';
import { User } from '../../users/entities/user.entity';

@Entity('pqrs_respuestas')
@Index('IDX_pqrs_respuestas_pqrsId', ['pqrsId'])
@Index('IDX_pqrs_respuestas_autorId', ['autorId'])
@Index('IDX_pqrs_respuestas_createdAt', ['createdAt'])
@Index('IDX_pqrs_respuestas_pqrs_createdAt', ['pqrsId', 'createdAt'])
export class PqrsRespuesta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  contenido: string;

  @Column({ type: 'boolean', default: false })
  esAdmin: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Pqrs, (pqrs) => pqrs.respuestas, { onDelete: 'CASCADE' })
  pqrs: Pqrs;

  @Column({ type: 'uuid' })
  pqrsId: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'SET NULL' })
  autor: User;

  @Column({ type: 'uuid' })
  autorId: string;
}
