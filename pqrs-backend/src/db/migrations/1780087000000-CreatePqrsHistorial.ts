import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePqrsHistorial1780087000000 implements MigrationInterface {
  name = 'CreatePqrsHistorial1780087000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."pqrs_historial_tipoevento_enum" AS ENUM(
        'pqrs_creada',
        'estado_cambiado',
        'prioridad_cambiada',
        'respuesta_agregada',
        'archivo_subido',
        'archivo_eliminado',
        'pqrs_eliminada'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "pqrs_historial" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tipoEvento" "public"."pqrs_historial_tipoevento_enum" NOT NULL,
        "detalle" jsonb,
        "descripcion" character varying,
        "actorId" uuid,
        "actorNombre" character varying,
        "pqrsId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pqrs_historial" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "pqrs_historial"
      ADD CONSTRAINT "FK_pqrs_historial_pqrs"
      FOREIGN KEY ("pqrsId") REFERENCES "pqrs"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "pqrs_historial"
      ADD CONSTRAINT "FK_pqrs_historial_actor"
      FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_historial_pqrs_id" ON "pqrs_historial" ("pqrsId")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_historial_created_at" ON "pqrs_historial" ("createdAt" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_historial_tipo" ON "pqrs_historial" ("tipoEvento")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_historial_pqrs_time" ON "pqrs_historial" ("pqrsId", "createdAt" ASC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_historial_pqrs_time"`);
    await queryRunner.query(`DROP INDEX "public"."idx_historial_tipo"`);
    await queryRunner.query(`DROP INDEX "public"."idx_historial_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."idx_historial_pqrs_id"`);
    await queryRunner.query(`ALTER TABLE "pqrs_historial" DROP CONSTRAINT "FK_pqrs_historial_actor"`);
    await queryRunner.query(`ALTER TABLE "pqrs_historial" DROP CONSTRAINT "FK_pqrs_historial_pqrs"`);
    await queryRunner.query(`DROP TABLE "pqrs_historial"`);
    await queryRunner.query(`DROP TYPE "public"."pqrs_historial_tipoevento_enum"`);
  }
}
