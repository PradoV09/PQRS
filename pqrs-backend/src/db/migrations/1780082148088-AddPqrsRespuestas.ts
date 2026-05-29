import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPqrsRespuestas1780082148088 implements MigrationInterface {
    name = 'AddPqrsRespuestas1780082148088'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_pqrs_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_pqrs_tipo"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_pqrs_estado"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_pqrs_createdAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_pqrs_attachments_pqrsId"`);
        await queryRunner.query(`CREATE TABLE "pqrs_respuestas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "contenido" text NOT NULL, "esAdmin" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "pqrsId" uuid NOT NULL, "autorId" uuid NOT NULL, CONSTRAINT "PK_76edf7c7eb4ba4a634b54e8ae9e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_pqrs_respuestas_pqrs_createdAt" ON "pqrs_respuestas"  ("pqrsId", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_pqrs_respuestas_createdAt" ON "pqrs_respuestas"  ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_pqrs_respuestas_autorId" ON "pqrs_respuestas"  ("autorId") `);
        await queryRunner.query(`CREATE INDEX "IDX_pqrs_respuestas_pqrsId" ON "pqrs_respuestas"  ("pqrsId") `);
        await queryRunner.query(`ALTER TABLE "pqrs_respuestas" ADD CONSTRAINT "FK_01df8637c45da4364a630833524" FOREIGN KEY ("pqrsId") REFERENCES "pqrs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pqrs_respuestas" ADD CONSTRAINT "FK_1d99db3c9f1511cc1995ca85854" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pqrs_respuestas" DROP CONSTRAINT "FK_1d99db3c9f1511cc1995ca85854"`);
        await queryRunner.query(`ALTER TABLE "pqrs_respuestas" DROP CONSTRAINT "FK_01df8637c45da4364a630833524"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_pqrs_respuestas_pqrsId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_pqrs_respuestas_autorId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_pqrs_respuestas_createdAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_pqrs_respuestas_pqrs_createdAt"`);
        await queryRunner.query(`DROP TABLE "pqrs_respuestas"`);
        await queryRunner.query(`CREATE INDEX "IDX_pqrs_attachments_pqrsId" ON "pqrs_attachments" USING btree ("pqrsId") `);
        await queryRunner.query(`CREATE INDEX "IDX_pqrs_createdAt" ON "pqrs" USING btree ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_pqrs_estado" ON "pqrs" USING btree ("estado") `);
        await queryRunner.query(`CREATE INDEX "IDX_pqrs_tipo" ON "pqrs" USING btree ("tipo") `);
        await queryRunner.query(`CREATE INDEX "IDX_pqrs_userId" ON "pqrs" USING btree ("userId") `);
    }

}
