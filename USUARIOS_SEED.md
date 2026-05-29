# Usuarios Iniciales del Sistema

Documentación de los usuarios creados por el seeder inicial del sistema PQRS.

## Credenciales de Acceso

| Usuario | Rol | Contraseña | Descripción |
|---------|-----|------------|-------------|
| admin_master@gmail.com | Administrador | Adm1n#2026 | Administrador maestro con acceso completo al sistema |
| supervisor_pqrs@gmail.com | Supervisor PQRS | Sup3rPqrs! | Supervisor encargado de gestionar PQRS asignadas |
| cliente_portal@gmail.com | Ciudadano | Cl13nte$Web | Usuario ciudadano para pruebas de registro y PQRS |

## Roles del Sistema

- **Administrador (admin)**: Acceso completo a todas las funcionalidades del sistema, incluyendo gestión de usuarios, cambio de estados de PQRS, estadísticas y configuración.
- **Supervisor (supervisor)**: Rol intermedio con permisos extendidos para gestionar PQRS asignadas y responder a ciudadanos.
- **Ciudadano (usuario)**: Rol por defecto para usuarios registrados. Pueden crear, consultar y gestionar sus propias PQRS.

## Notas de Seguridad

- Las contraseñas están hasheadas con bcrypt (cost factor 12) en la base de datos.
- Los usuarios creados por el seeder tienen la cuenta activa (`isActive = true`).
- El seeder verifica si el usuario existe antes de crearlo para evitar duplicados.

## Ejecución del Seeder

```bash
cd pqrs-backend

# Ejecutar migraciones (si hay cambios en el esquema)
npm run migration:run

# Ejecutar seeders
npm run seed
```

## Solución de Problemas

Si la migración para agregar el rol supervisor falla con error 42704, significa que el enum ya existe en la base de datos. Ejecute manualmente:

```sql
-- Agregar valor 'supervisor' al enum user_role_enum
ALTER TYPE "user_role_enum" ADD VALUE 'supervisor';
```

Luego ejecute el seeder nuevamente.
