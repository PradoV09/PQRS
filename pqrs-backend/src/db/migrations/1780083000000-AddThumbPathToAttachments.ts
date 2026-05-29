import { MigrationInterface, QueryRunner } from "typeorm";

export class AddThumbPathToAttachments1780083000000 implements MigrationInterface {
    name = 'AddThumbPathToAttachments1780083000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pqrs_attachments" ADD COLUMN "thumbPath" varchar NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pqrs_attachments" DROP COLUMN "thumbPath"`);
    }

}
