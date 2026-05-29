import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePqrsAndAttachments1780080828906 implements MigrationInterface {
    name = 'CreatePqrsAndAttachments1780080828906'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."pqrs_tipo_enum" AS ENUM('peticion', 'queja', 'reclamo', 'sugerencia')`);
        await queryRunner.query(`CREATE TYPE "public"."pqrs_estado_enum" AS ENUM('pendiente', 'en_proceso', 'resuelto', 'cerrado')`);
        await queryRunner.query(`CREATE TABLE "pqrs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "titulo" character varying(200) NOT NULL, "descripcion" text NOT NULL, "tipo" "public"."pqrs_tipo_enum" NOT NULL DEFAULT 'peticion', "estado" "public"."pqrs_estado_enum" NOT NULL DEFAULT 'pendiente', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid NOT NULL, CONSTRAINT "PK_27043af9b0edb4aa8282e475ade" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "pqrs_attachments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "filename" character varying NOT NULL, "storedName" character varying NOT NULL, "mimetype" character varying NOT NULL, "size" integer NOT NULL, "path" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "pqrsId" uuid NOT NULL, CONSTRAINT "PK_637df472516ed4929d1686c4bb5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "pqrs" ADD CONSTRAINT "FK_d20e838402282a33f191def0f99" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pqrs_attachments" ADD CONSTRAINT "FK_39696ce10ed2bb7047f28127ab0" FOREIGN KEY ("pqrsId") REFERENCES "pqrs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        
        // Custom indexes requested by user
        await queryRunner.query(`CREATE INDEX "IDX_pqrs_userId" ON "pqrs" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_pqrs_tipo" ON "pqrs" ("tipo")`);
        await queryRunner.query(`CREATE INDEX "IDX_pqrs_estado" ON "pqrs" ("estado")`);
        await queryRunner.query(`CREATE INDEX "IDX_pqrs_createdAt" ON "pqrs" ("createdAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_pqrs_attachments_pqrsId" ON "pqrs_attachments" ("pqrsId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_pqrs_attachments_pqrsId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_pqrs_createdAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_pqrs_estado"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_pqrs_tipo"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_pqrs_userId"`);

        await queryRunner.query(`ALTER TABLE "pqrs_attachments" DROP CONSTRAINT "FK_39696ce10ed2bb7047f28127ab0"`);
        await queryRunner.query(`ALTER TABLE "pqrs" DROP CONSTRAINT "FK_d20e838402282a33f191def0f99"`);
        await queryRunner.query(`DROP TABLE "pqrs_attachments"`);
        await queryRunner.query(`DROP TABLE "pqrs"`);
        await queryRunner.query(`DROP TYPE "public"."pqrs_estado_enum"`);
        await queryRunner.query(`DROP TYPE "public"."pqrs_tipo_enum"`);
    }

}
