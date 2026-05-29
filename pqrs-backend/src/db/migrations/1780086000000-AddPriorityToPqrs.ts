import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriorityToPqrs1780086000000 implements MigrationInterface {
  name = 'AddPriorityToPqrs1780086000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."pqrs_prioridad_enum" AS ENUM('baja', 'media', 'alta', 'urgente')
    `);
    await queryRunner.query(`
      ALTER TABLE "pqrs"
      ADD COLUMN "prioridad" "public"."pqrs_prioridad_enum" NOT NULL DEFAULT 'media'
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_pqrs_prioridad" ON "pqrs" ("prioridad")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_pqrs_prioridad_created" ON "pqrs" ("prioridad", "createdAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_pqrs_prioridad_created"`);
    await queryRunner.query(`DROP INDEX "public"."idx_pqrs_prioridad"`);
    await queryRunner.query(`ALTER TABLE "pqrs" DROP COLUMN "prioridad"`);
    await queryRunner.query(`DROP TYPE "public"."pqrs_prioridad_enum"`);
  }
}
