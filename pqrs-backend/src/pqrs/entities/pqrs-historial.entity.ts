import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { PqrsEventType } from '../../common/enums/pqrs-event-type.enum';
import { Pqrs } from './pqrs.entity';
import { User } from '../../users/entities/user.entity';

@Entity('pqrs_historial')
export class PqrsHistorial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PqrsEventType })
  tipoEvento: PqrsEventType;

  @Column({ type: 'jsonb', nullable: true })
  detalle: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  descripcion: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => Pqrs, (pqrs) => pqrs.historial, { onDelete: 'CASCADE' })
  pqrs: Pqrs;

  @Column({ type: 'uuid' })
  pqrsId: string;

  @ManyToOne(() => User, { eager: false, nullable: true, onDelete: 'SET NULL' })
  actor: User | null;

  @Column({ type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', nullable: true })
  actorNombre: string | null;
}
