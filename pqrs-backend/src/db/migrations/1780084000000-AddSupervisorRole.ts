import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSupervisorRole1780084000000 implements MigrationInterface {
    name = 'AddSupervisorRole1780084000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if 'supervisor' already exists in the enum
        const enumValues = await queryRunner.query(`
            SELECT enumlabel 
            FROM pg_enum 
            WHERE enumtypid = 'users_rol_enum'::regtype
        `);

        const hasSupervisor = enumValues.some((row: any) => row.enumlabel === 'supervisor');

        if (!hasSupervisor) {
            // Add 'supervisor' to the users_rol enum
            await queryRunner.query(`ALTER TYPE "public"."users_rol_enum" ADD VALUE 'supervisor'`);
        } else {
            console.log('Supervisor role already exists in enum. Skipping...');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: PostgreSQL doesn't support removing enum values directly
        // To rollback, you would need to recreate the enum without the value
        console.log('Warning: Cannot remove enum value in PostgreSQL. Manual intervention required.');
    }
}
