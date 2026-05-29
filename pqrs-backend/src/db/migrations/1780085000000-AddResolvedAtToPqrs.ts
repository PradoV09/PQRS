import { MigrationInterface, QueryRunner } from "typeorm";

export class AddResolvedAtToPqrs1780085000000 implements MigrationInterface {
    name = 'AddResolvedAtToPqrs1780085000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "pqrs" 
            ADD COLUMN "resolvedAt" TIMESTAMP NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "pqrs" 
            DROP COLUMN "resolvedAt"
        `);
    }
}
