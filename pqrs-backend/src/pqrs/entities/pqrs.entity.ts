import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PqrsType } from '../../common/enums/pqrs-type.enum';
import { PqrsStatus } from '../../common/enums/pqrs-status.enum';
import { PqrsPriority } from '../../common/enums/pqrs-priority.enum';
import { PqrsAttachment } from './pqrs-attachment.entity';
import { PqrsRespuesta } from './pqrs-respuesta.entity';
import { PqrsHistorial } from './pqrs-historial.entity';

@Entity('pqrs')
export class Pqrs {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  titulo: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({
    type: 'enum',
    enum: PqrsType,
    default: PqrsType.PETICION,
  })
  tipo: PqrsType;

  @Column({
    type: 'enum',
    enum: PqrsStatus,
    default: PqrsStatus.PENDIENTE,
  })
  estado: PqrsStatus;

  @Column({
    type: 'enum',
    enum: PqrsPriority,
    default: PqrsPriority.MEDIA,
  })
  prioridad: PqrsPriority;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true, default: null })
  resolvedAt: Date | null;

  @ManyToOne(() => User, { eager: false })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @OneToMany(() => PqrsAttachment, (att) => att.pqrs, { cascade: true, eager: true })
  attachments: PqrsAttachment[];

  @OneToMany(() => PqrsRespuesta, (resp) => resp.pqrs, { cascade: true })
  respuestas: PqrsRespuesta[];

  @OneToMany(() => PqrsHistorial, (h) => h.pqrs, { cascade: true })
  historial: PqrsHistorial[];
}
