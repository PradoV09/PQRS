import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRadicadoToPqrs1780093000000 implements MigrationInterface {
    name = 'AddRadicadoToPqrs1780093000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pqrs" ADD "radicado" character varying`);
        await queryRunner.query(`ALTER TABLE "pqrs" ADD CONSTRAINT "UQ_pqrs_radicado" UNIQUE ("radicado")`);
        await queryRunner.query(`CREATE INDEX "idx_pqrs_radicado" ON "pqrs" ("radicado")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_pqrs_radicado"`);
        await queryRunner.query(`ALTER TABLE "pqrs" DROP CONSTRAINT "UQ_pqrs_radicado"`);
        await queryRunner.query(`ALTER TABLE "pqrs" DROP COLUMN "radicado"`);
    }
}