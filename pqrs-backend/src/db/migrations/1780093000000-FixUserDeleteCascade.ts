import { MigrationInterface, QueryRunner } from "typeorm";

export class FixUserDeleteCascade1780093000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Corregir la relación del creador (userId)
        // Primero eliminamos la restricción actual (el nombre FK_d20e838402282a33f191def0f99 viene de tu log de error)
        await queryRunner.query(`ALTER TABLE "pqrs" DROP CONSTRAINT "FK_d20e838402282a33f191def0f99"`);

        // La recreamos con ON DELETE CASCADE para que al borrar un usuario se borren sus PQRS
        await queryRunner.query(`
            ALTER TABLE "pqrs" 
            ADD CONSTRAINT "FK_pqrs_userId" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") 
            ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pqrs" DROP CONSTRAINT "FK_pqrs_userId"`);
        await queryRunner.query(`
            ALTER TABLE "pqrs" 
            ADD CONSTRAINT "FK_d20e838402282a33f191def0f99" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") 
            ON DELETE NO ACTION
        `);
    }
}