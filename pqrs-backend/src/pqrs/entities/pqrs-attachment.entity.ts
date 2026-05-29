import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Pqrs } from './pqrs.entity';

@Entity('pqrs_attachments')
export class PqrsAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  filename: string;

  @Column({ type: 'varchar' })
  storedName: string;

  @Column({ type: 'varchar' })
  mimetype: string;

  @Column({ type: 'integer' })
  size: number;

  @Column({ type: 'varchar' })
  path: string;

  @Column({ type: 'varchar', nullable: true })
  thumbPath: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => Pqrs, (pqrs) => pqrs.attachments, { onDelete: 'CASCADE' })
  pqrs: Pqrs;

  @Column({ type: 'uuid' })
  pqrsId: string;
}
