import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsersTable1780079949478 implements MigrationInterface {
    name = 'CreateUsersTable1780079949478'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_rol_enum" AS ENUM('admin', 'usuario')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(100) NOT NULL, "email" character varying(255) NOT NULL, "passwordHash" character varying NOT NULL, "rol" "public"."users_rol_enum" NOT NULL DEFAULT 'usuario', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_rol_enum"`);
    }

}
