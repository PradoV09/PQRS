import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddAssignmentToPqrs1780092000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Crear el enum pqrs_area_enum
        await queryRunner.query(`
      CREATE TYPE "pqrs_area_enum" AS ENUM (
        'servicio_al_cliente',
        'quejas_y_reclamos',
        'peticiones',
        'sugerencias',
        'recursos_humanos',
        'tesoreria',
        'infraestructura',
        'legal',
        'general'
      )
    `);

        // Agregar columna area
        await queryRunner.addColumn(
            'pqrs',
            new TableColumn({
                name: 'area',
                type: 'pqrs_area_enum',
                isNullable: true,
            }),
        );

        // Agregar columna supervisorAsignadoId
        await queryRunner.addColumn(
            'pqrs',
            new TableColumn({
                name: 'supervisorAsignadoId',
                type: 'uuid',
                isNullable: true,
            }),
        );

        // Agregar la restricción de clave foránea
        await queryRunner.createForeignKey(
            'pqrs',
            new TableForeignKey({
                columnNames: ['supervisorAsignadoId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'SET NULL',
            }),
        );

        // Crear índice en supervisorAsignadoId para mejorar búsquedas
        await queryRunner.query(
            `CREATE INDEX "IDX_pqrs_supervisorAsignadoId" ON "pqrs" ("supervisorAsignadoId")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar el índice
        await queryRunner.query(
            `DROP INDEX IF EXISTS "IDX_pqrs_supervisorAsignadoId"`,
        );

        // Eliminar la clave foránea
        await queryRunner.dropForeignKey('pqrs', 'FK_pqrs_supervisorAsignadoId_users_id');

        // Eliminar la columna supervisorAsignadoId
        await queryRunner.dropColumn('pqrs', 'supervisorAsignadoId');

        // Eliminar la columna area
        await queryRunner.dropColumn('pqrs', 'area');

        // Eliminar el enum
        await queryRunner.query(`DROP TYPE "pqrs_area_enum"`);
    }
}
