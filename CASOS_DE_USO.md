# Casos de uso — Sistema PQRS

## 1. Actores

| Actor | Tipo | Descripción | Rol en el sistema |
|-------|------|-------------|------------------|
| Ciudadano | Primario | Persona que radica PQRS, consulta el estado de sus solicitudes y recibe respuestas de los funcionarios. | Rol: 'usuario' |
| Funcionario | Primario | Empleado de la entidad que atiende las PQRS asignadas, responde al ciudadano y solicita cambio de estado al administrador. | Rol: 'usuario' con permisos extendidos (actualmente mapeado como usuario con capacidad de respuesta) |
| Administrador | Primario | Gestiona usuarios, cambia estados de PQRS, genera reportes y supervisa el sistema completo. | Rol: 'admin' |
| Sistema | Secundario | Acciones automáticas sin intervención humana: envío de notificaciones, limpieza de archivos huérfanos, validación de tokens, expiración de sesiones. | Actor automatizado |

---

## 2. Tabla resumen de casos de uso

| ID | Nombre | Actor principal | Módulo | Prioridad |
|----|--------|-----------------|---------|-----------|
| CU-01 | Registrarse en el sistema | Ciudadano | Autenticación | Alta |
| CU-02 | Iniciar sesión | Ciudadano, Funcionario, Administrador | Autenticación | Alta |
| CU-03 | Cerrar sesión | Ciudadano, Funcionario, Administrador | Autenticación | Alta |
| CU-04 | Crear PQRS | Ciudadano | Gestión PQRS | Alta |
| CU-05 | Consultar mis PQRS | Ciudadano | Gestión PQRS | Alta |
| CU-06 | Ver detalle de una PQRS | Ciudadano, Funcionario, Administrador | Gestión PQRS | Alta |
| CU-07 | Descargar archivo adjunto | Ciudadano, Administrador | Archivos | Alta |
| CU-08 | Responder una PQRS (ciudadano) | Ciudadano | Gestión PQRS | Media |
| CU-09 | Eliminar una PQRS | Ciudadano | Gestión PQRS | Media |
| CU-10 | Ver todas las PQRS (admin) | Administrador | Gestión PQRS | Alta |
| CU-11 | Responder una PQRS (admin) | Administrador | Gestión PQRS | Alta |
| CU-12 | Cambiar estado de una PQRS | Administrador | Gestión PQRS | Alta |
| CU-13 | Ver estadísticas del sistema | Administrador | Panel Admin | Media |
| CU-14 | Gestionar usuarios | Administrador | Panel Admin | Alta |
| CU-15 | Subir archivos adicionales a una PQRS | Ciudadano, Administrador | Archivos | Media |
| CU-16 | Eliminar un archivo adjunto | Ciudadano, Administrador | Archivos | Media |
| CU-17 | Validar token JWT en cada petición | Sistema | Autenticación | Alta |
| CU-18 | Limpieza nocturna de archivos huérfanos | Sistema | Archivos | Baja |

---

## 3. Descripción detallada de cada caso de uso

### CU-01 — Registrarse en el sistema

| Campo | Detalle |
|-------|---------|
| ID | CU-01 |
| Nombre | Registrarse en el sistema |
| Actor principal | Ciudadano |
| Actores secundarios | Sistema |
| Precondición | El correo no existe en la base de datos |
| Postcondición | Cuenta creada, sesión iniciada |
| Prioridad | Alta |
| Frecuencia | Esporádica |

**Flujo principal:**
1. El ciudadano ingresa nombre, correo y contraseña.
2. El sistema valida el formato y la fortaleza de la contraseña.
3. El sistema hashea la contraseña con bcrypt (cost 12) y crea la cuenta.
4. El sistema retorna un accessToken (15 min) y refreshToken (7 días).
5. El ciudadano es redirigido al dashboard.

**Flujos alternativos:**
- **A (correo duplicado):** 2a. El sistema retorna error 409 "Este correo ya está registrado".
- **B (contraseña débil):** 2b. El sistema muestra los requisitos de contraseña incumplidos.

**Reglas de negocio:**
- RN-02: Las contraseñas se almacenan con bcrypt (cost 12).
- RN-07: Variables sensibles (JWT_SECRET) solo en .env.

**Notas de implementación:**
- **Frontend:** `RegisterComponent` en `src/app/features/auth/register/`
- **Backend:** `POST /api/auth/register` en `src/auth/auth.controller.ts`
- **DTO:** `RegisterDto` con validaciones de class-validator

---

### CU-02 — Iniciar sesión

| Campo | Detalle |
|-------|---------|
| ID | CU-02 |
| Nombre | Iniciar sesión |
| Actor principal | Ciudadano, Funcionario, Administrador |
| Actores secundarios | Sistema |
| Precondición | Cuenta existente y activa (isActive = true) |
| Postcondición | Sesión activa con token almacenado en localStorage |
| Prioridad | Alta |
| Frecuencia | Diaria |

**Flujo principal:**
1. El usuario ingresa correo y contraseña.
2. El sistema valida credenciales con bcrypt.compare.
3. El sistema emite accessToken (15 min) y refreshToken (7 días).
4. El usuario es redirigido a /dashboard.

**Flujos alternativos:**
- **A (credenciales incorrectas):** 2a. El sistema retorna 401. No expone si el error es el correo o la contraseña (mensaje genérico de seguridad).
- **B (cuenta inactiva):** 2b. El sistema retorna 401 indicando que la cuenta está inactiva.

**Reglas de negocio:**
- RN-01: El userId siempre se extrae del JWT, nunca del body.
- RN-02: Las contraseñas se almacenan con bcrypt (cost 12).

**Notas de implementación:**
- **Frontend:** `LoginComponent` en `src/app/features/auth/login/`
- **Backend:** `POST /api/auth/login` en `src/auth/auth.controller.ts`
- **DTO:** `LoginDto` con validaciones

---

### CU-03 — Cerrar sesión

| Campo | Detalle |
|-------|---------|
| ID | CU-03 |
| Nombre | Cerrar sesión |
| Actor principal | Ciudadano, Funcionario, Administrador |
| Actores secundarios | - |
| Precondición | Sesión activa |
| Postcondición | Sesión destruida en el cliente |
| Prioridad | Alta |
| Frecuencia | Diaria |

**Flujo principal:**
1. El usuario pulsa "Cerrar sesión".
2. El frontend elimina el token de localStorage.
3. El usuario es redirigido a /login.

**Flujos alternativos:**
- Ninguno aplicable.

**Reglas de negocio:**
- RN-01: El userId siempre se extrae del JWT, nunca del body.

**Notas de implementación:**
- **Frontend:** `AuthService.logout()` en `src/app/core/services/auth.service.ts`
- **Backend:** No requiere endpoint específico (logout es del lado del cliente)

---

### CU-04 — Crear PQRS

| Campo | Detalle |
|-------|---------|
| ID | CU-04 |
| Nombre | Crear PQRS |
| Actor principal | Ciudadano |
| Actores secundarios | Sistema |
| Precondición | Sesión activa |
| Postcondición | PQRS en estado 'pendiente' con adjuntos |
| Prioridad | Alta |
| Frecuencia | Esporádica |

**Flujo principal:**
1. El ciudadano accede a /pqrs/crear.
2. Rellena: título (5-200 chars), descripción (≥10 chars), tipo (Petición / Queja / Reclamo / Sugerencia).
3. Opcionalmente adjunta hasta 5 archivos (≤10 MB c/u): imágenes, PDF, DOCX, MP4, MOV.
4. El sistema valida mimetype + extensión con Multer.
5. El sistema guarda la PQRS con estado 'pendiente' y vincula los archivos con nombres uuid.ext.
6. El sistema redirige a /pqrs con toast de éxito.

**Flujos alternativos:**
- **A (archivo inválido):** 4a. El sistema rechaza el archivo con mensaje descriptivo antes de guardar nada.
- **B (campos inválidos):** 2b. El sistema muestra errores de validación en el formulario.

**Reglas de negocio:**
- RN-01: El userId siempre se extrae del JWT, nunca del body.
- RN-03: Los archivos se almacenan con nombre uuid.ext.
- RN-05: El ciudadano solo ve sus propias PQRS.

**Notas de implementación:**
- **Frontend:** `CreatePqrsComponent` en `src/app/features/pqrs/create-pqrs/`
- **Backend:** `POST /api/pqrs` en `src/pqrs/pqrs.controller.ts`
- **DTO:** `CreatePqrsDto` con validaciones
- **Include:** CU-15 Subir archivos

---

### CU-05 — Consultar mis PQRS

| Campo | Detalle |
|-------|---------|
| ID | CU-05 |
| Nombre | Consultar mis PQRS |
| Actor principal | Ciudadano |
| Actores secundarios | Sistema |
| Precondición | Sesión activa |
| Postcondición | Lista paginada de sus propias PQRS |
| Prioridad | Alta |
| Frecuencia | Diaria |

**Flujo principal:**
1. El ciudadano accede a /pqrs.
2. El sistema retorna solo las PQRS del userId del JWT (el ciudadano nunca ve PQRS de otros usuarios).
3. El ciudadano puede filtrar por estado y paginar resultados.

**Flujos alternativos:**
- Ninguno aplicable.

**Reglas de negocio:**
- RN-01: El userId siempre se extrae del JWT, nunca del body.
- RN-05: El ciudadano solo ve sus propias PQRS.

**Notas de implementación:**
- **Frontend:** `PqrsListComponent` en `src/app/features/pqrs/pqrs-list/`
- **Backend:** `GET /api/pqrs` en `src/pqrs/pqrs.controller.ts`
- **DTO:** `PqrsQueryDto` con filtros y paginación
- **Extend:** CU-17 Validar token JWT

---

### CU-06 — Ver detalle de una PQRS

| Campo | Detalle |
|-------|---------|
| ID | CU-06 |
| Nombre | Ver detalle de una PQRS |
| Actor principal | Ciudadano, Funcionario, Administrador |
| Actores secundarios | - |
| Precondición | Sesión activa, ser dueño de la PQRS o ser admin |
| Postcondición | Vista de detalle cargada |
| Prioridad | Alta |
| Frecuencia | Diaria |

**Flujo principal:**
1. El usuario pulsa "Ver detalle" en la lista.
2. El sistema muestra: título, descripción, tipo, estado, archivos adjuntos y el hilo de respuestas.

**Flujos alternativos:**
- **A (no es dueño):** El sistema retorna 403 Forbidden.
- **B (PQRS no encontrada):** El sistema retorna 404 Not Found.

**Reglas de negocio:**
- RN-01: El userId siempre se extrae del JWT, nunca del body.
- RN-05: El ciudadano solo ve sus propias PQRS.

**Notas de implementación:**
- **Frontend:** `PqrsDetailComponent` en `src/app/features/pqrs/pqrs-detail/`
- **Backend:** `GET /api/pqrs/:id` en `src/pqrs/pqrs.controller.ts`

---

### CU-07 — Descargar archivo adjunto

| Campo | Detalle |
|-------|---------|
| ID | CU-07 |
| Nombre | Descargar archivo adjunto |
| Actor principal | Ciudadano, Administrador |
| Actores secundarios | Sistema |
| Precondición | Ser dueño de la PQRS o ser admin |
| Postcondición | Archivo descargado con nombre original |
| Prioridad | Alta |
| Frecuencia | Esporádica |

**Flujo principal:**
1. El usuario pulsa "Descargar" en un adjunto.
2. El sistema verifica permisos antes de servir el archivo.
3. El archivo se descarga con el nombre original.

**Flujos alternativos:**
- **A (sin permisos):** El sistema retorna 403. El archivo físico nunca se expone.
- **B (archivo no encontrado):** El sistema retorna 404.

**Reglas de negocio:**
- RN-01: El userId siempre se extrae del JWT, nunca del body.
- RN-03: Los archivos se almacenan con nombre uuid.ext.

**Notas de implementación:**
- **Frontend:** `AttachmentGalleryComponent` en `src/app/shared/components/attachment-gallery/`
- **Backend:** `GET /api/pqrs/:id/attachments/:attId/download` en `src/pqrs/pqrs.controller.ts`

---

### CU-08 — Responder una PQRS (ciudadano)

| Campo | Detalle |
|-------|---------|
| ID | CU-08 |
| Nombre | Responder una PQRS (ciudadano) |
| Actor principal | Ciudadano |
| Actores secundarios | - |
| Precondición | Ser dueño, estado 'pendiente' o 'en_proceso' |
| Postcondición | Respuesta agregada al hilo de conversación |
| Prioridad | Media |
| Frecuencia | Esporádica |

**Flujo principal:**
1. El ciudadano escribe una respuesta (5-2000 chars).
2. El sistema guarda la respuesta con esAdmin = false.
3. La respuesta aparece en el hilo de conversación.

**Flujos alternativos:**
- **A (PQRS cerrada):** El formulario de respuesta no se muestra.
- **B (estado inválido):** El sistema retorna 400 indicando que no se puede responder en ese estado.

**Reglas de negocio:**
- RN-01: El userId siempre se extrae del JWT, nunca del body.
- RN-06: Un PQRS cerrado no admite más respuestas ni cambios.

**Notas de implementación:**
- **Frontend:** `PqrsDetailComponent` en `src/app/features/pqrs/pqrs-detail/`
- **Backend:** `POST /api/pqrs/:id/respuestas` en `src/pqrs/pqrs.controller.ts`
- **DTO:** `CreateRespuestaDto` con validaciones

---

### CU-09 — Eliminar una PQRS

| Campo | Detalle |
|-------|---------|
| ID | CU-09 |
| Nombre | Eliminar una PQRS |
| Actor principal | Ciudadano (solo si es dueño), Administrador |
| Actores secundarios | Sistema |
| Precondición | Ser dueño o admin, PQRS no cerrada |
| Postcondición | PQRS eliminada con archivos físicos borrados |
| Prioridad | Media |
| Frecuencia | Esporádica |

**Flujo principal:**
1. El usuario confirma la eliminación en un diálogo.
2. El sistema elimina los archivos del disco (fs.unlink).
3. El sistema elimina el registro en cascada (PQRS + adjuntos + respuestas).
4. El usuario es redirigido a /pqrs con toast de éxito.

**Flujos alternativos:**
- **A (sin permisos):** El sistema retorna 403.
- **B (PQRS cerrada):** El sistema retorna 400 indicando que no se puede eliminar una PQRS cerrada.

**Reglas de negocio:**
- RN-01: El userId siempre se extrae del JWT, nunca del body.
- RN-06: Un PQRS cerrado no admite más respuestas ni cambios.

**Notas de implementación:**
- **Frontend:** `PqrsDetailComponent` en `src/app/features/pqrs/pqrs-detail/`
- **Backend:** `DELETE /api/pqrs/:id` en `src/pqrs/pqrs.controller.ts`

---

### CU-10 — Ver todas las PQRS (admin)

| Campo | Detalle |
|-------|---------|
| ID | CU-10 |
| Nombre | Ver todas las PQRS (admin) |
| Actor principal | Administrador |
| Actores secundarios | - |
| Precondición | Rol 'admin', sesión activa |
| Postcondición | Vista completa de todas las PQRS del sistema |
| Prioridad | Alta |
| Frecuencia | Diaria |

**Flujo principal:**
1. El admin accede a /admin (panel administrativo).
2. El sistema retorna TODAS las PQRS sin filtro de userId.
3. El admin puede filtrar por tipo, estado, búsqueda de texto, rango de fechas y ordenar los resultados.
4. La tabla muestra el nombre del usuario creador en cada fila.

**Flujos alternativos:**
- **A (sin permisos):** El sistema retorna 403 y redirige a /pqrs.

**Reglas de negocio:**
- RN-01: El userId siempre se extrae del JWT, nunca del body.

**Notas de implementación:**
- **Frontend:** `AdminComponent` en `src/app/features/admin/`
- **Backend:** `GET /api/pqrs` en `src/pqrs/pqrs.controller.ts` (con rol admin)
- **DTO:** `PqrsQueryDto` con filtros extendidos

---

### CU-11 — Responder una PQRS (admin)

| Campo | Detalle |
|-------|---------|
| ID | CU-11 |
| Nombre | Responder una PQRS (admin) |
| Actor principal | Administrador |
| Actores secundarios | - |
| Precondición | Rol 'admin', PQRS no cerrada |
| Postcondición | Respuesta agregada con esAdmin = true |
| Prioridad | Alta |
| Frecuencia | Diaria |

**Flujo principal:**
1. El admin escribe una respuesta (5-2000 chars).
2. El sistema guarda la respuesta con esAdmin = true.
3. Si el estado es 'pendiente', el sistema lo cambia automáticamente a 'en_proceso'.
4. La respuesta aparece en el hilo con estilo diferenciado.

**Flujos alternativos:**
- **A (PQRS cerrada):** El sistema retorna 400 indicando que no se puede responder.
- **B (sin permisos):** El sistema retorna 403.

**Reglas de negocio:**
- RN-01: El userId siempre se extrae del JWT, nunca del body.
- RN-04: La máquina de estados solo permite transiciones válidas.
- RN-06: Un PQRS cerrado no admite más respuestas ni cambios.

**Notas de implementación:**
- **Frontend:** `AdminComponent` en `src/app/features/admin/`
- **Backend:** `POST /api/pqrs/:id/respuestas` en `src/pqrs/pqrs.controller.ts`
- **DTO:** `CreateRespuestaDto` con validaciones
- **Extend:** CU-12 Cambiar estado automático

---

### CU-12 — Cambiar estado de una PQRS

| Campo | Detalle |
|-------|---------|
| ID | CU-12 |
| Nombre | Cambiar estado de una PQRS |
| Actor principal | Administrador |
| Actores secundarios | - |
| Precondición | Rol 'admin', transición válida según máquina |
| Postcondición | Estado de PQRS actualizado |
| Prioridad | Alta |
| Frecuencia | Diaria |

**Flujo principal:**
1. El admin selecciona el nuevo estado en el select (solo se muestran transiciones válidas).
2. El sistema valida la transición en el backend.
3. El estado se actualiza y se recarga el detalle.

**Flujos alternativos:**
- **A (transición inválida):** El sistema retorna 400 con mensaje: "No se puede pasar de 'resuelto' a 'pendiente'".
- **B (sin permisos):** El sistema retorna 403.

**Reglas de negocio:**
- RN-04: La máquina de estados solo permite transiciones válidas:
  - pendiente → en_proceso | cerrado
  - en_proceso → resuelto | cerrado
  - resuelto → cerrado
  - cerrado → (estado final, sin transiciones)

**Notas de implementación:**
- **Frontend:** `AdminComponent` en `src/app/features/admin/`
- **Backend:** `PATCH /api/pqrs/:id/status` en `src/pqrs/pqrs.controller.ts`
- **DTO:** `UpdatePqrsStatusDto` con validaciones

---

### CU-13 — Ver estadísticas del sistema

| Campo | Detalle |
|-------|---------|
| ID | CU-13 |
| Nombre | Ver estadísticas del sistema |
| Actor principal | Administrador |
| Actores secundarios | - |
| Precondición | Rol 'admin', sesión activa |
| Postcondición | Estadísticas del sistema cargadas |
| Prioridad | Media |
| Frecuencia | Semanal |

**Flujo principal:**
1. El admin accede al panel administrativo.
2. El sistema muestra:
   - Total de PQRS en el sistema.
   - PQRS por estado (conteo de cada uno).
   - PQRS por tipo (conteo de cada uno).
   - PQRS creadas en los últimos 7 días.
   - Tiempo promedio de resolución en días.

**Flujos alternativos:**
- **A (sin permisos):** El sistema retorna 403.

**Reglas de negocio:**
- RN-01: El userId siempre se extrae del JWT, nunca del body.

**Notas de implementación:**
- **Frontend:** `AdminComponent` en `src/app/features/admin/`
- **Backend:** `GET /api/pqrs/stats` en `src/pqrs/pqrs.controller.ts`

---

### CU-14 — Gestionar usuarios

| Campo | Detalle |
|-------|---------|
| ID | CU-14 |
| Nombre | Gestionar usuarios |
| Actor principal | Administrador |
| Actores secundarios | - |
| Precondición | Rol 'admin', sesión activa |
| Postcondición | Usuarios gestionados (activados/desactivados) |
| Prioridad | Alta |
| Frecuencia | Semanal |

**Flujo principal:**
1. El admin ve la lista de usuarios registrados.
2. Puede activar / desactivar cuentas (isActive).
3. Puede cambiar el rol de un usuario (usuario → admin).

**Flujos alternativos:**
- **A (sin permisos):** El sistema retorna 403.
- **B (auto-desactivación):** El admin no puede desactivar su propia cuenta.

**Reglas de negocio:**
- RN-01: El userId siempre se extrae del JWT, nunca del body.

**Notas de implementación:**
- **Frontend:** `AdminComponent` en `src/app/features/admin/`
- **Backend:** `GET /api/users`, `PATCH /api/users/:id/status` en `src/users/users.controller.ts`

---

### CU-15 — Subir archivos adicionales a una PQRS

| Campo | Detalle |
|-------|---------|
| ID | CU-15 |
| Nombre | Subir archivos adicionales a una PQRS |
| Actor principal | Ciudadano, Administrador |
| Actores secundarios | Sistema |
| Precondición | Ser dueño o admin, PQRS no cerrada |
| Postcondición | Archivos adicionales disponibles para descarga |
| Prioridad | Media |
| Frecuencia | Esporádica |

**Flujo principal:**
1. El usuario adjunta archivos en el formulario de detalle.
2. El sistema valida mimetype + extensión + tamaño.
3. Para imágenes, genera thumbnail 128x128 WEBP.
4. Los archivos quedan disponibles para descarga.

**Flujos alternativos:**
- **A (PQRS cerrada):** El sistema retorna 400 indicando que no se pueden agregar archivos.
- **B (sin permisos):** El sistema retorna 403.
- **C (archivo inválido):** El sistema rechaza el archivo con mensaje descriptivo.

**Reglas de negocio:**
- RN-01: El userId siempre se extrae del JWT, nunca del body.
- RN-03: Los archivos se almacenan con nombre uuid.ext.
- RN-06: Un PQRS cerrado no admite más respuestas ni cambios.

**Notas de implementación:**
- **Frontend:** `PqrsDetailComponent` en `src/app/features/pqrs/pqrs-detail/`
- **Backend:** `POST /api/pqrs/:id/attachments` en `src/pqrs/pqrs.controller.ts`

---

### CU-16 — Eliminar un archivo adjunto

| Campo | Detalle |
|-------|---------|
| ID | CU-16 |
| Nombre | Eliminar un archivo adjunto |
| Actor principal | Ciudadano (dueño), Administrador |
| Actores secundarios | Sistema |
| Precondición | Ser dueño o admin, PQRS no cerrada |
| Postcondición | Archivo eliminado físicamente y de la BD |
| Prioridad | Media |
| Frecuencia | Esporádica |

**Flujo principal:**
1. El usuario pulsa el botón X sobre el adjunto.
2. El sistema verifica permisos.
3. El sistema elimina el archivo físico y el thumbnail.
4. El registro se borra de la BD.
5. La galería se actualiza sin recargar la página.

**Flujos alternativos:**
- **A (sin permisos):** El sistema retorna 403.
- **B (PQRS cerrada):** El sistema retorna 400 indicando que no se pueden eliminar archivos.

**Reglas de negocio:**
- RN-01: El userId siempre se extrae del JWT, nunca del body.
- RN-03: Los archivos se almacenan con nombre uuid.ext.
- RN-06: Un PQRS cerrado no admite más respuestas ni cambios.

**Notas de implementación:**
- **Frontend:** `AttachmentGalleryComponent` en `src/app/shared/components/attachment-gallery/`
- **Backend:** `DELETE /api/files/:id` en `src/files/files.controller.ts`

---

### CU-17 — Validar token JWT en cada petición

| Campo | Detalle |
|-------|---------|
| ID | CU-17 |
| Nombre | Validar token JWT en cada petición |
| Actor principal | Sistema |
| Actores secundarios | - |
| Precondición | Petición a ruta protegida |
| Postcondición | Token validado o rechazado |
| Prioridad | Alta |
| Frecuencia | Continua |

**Flujo principal:**
1. El JwtAuthGuard verifica la firma y expiración del token antes de permitir el acceso a cualquier ruta protegida.
2. Si el token es válido, la petición continúa.
3. Si el token expiró o es inválido, retorna 401.

**Flujos alternativos:**
- **A (token inválido):** El sistema retorna 401 Unauthorized.
- **B (token expirado):** El sistema retorna 401 Unauthorized.

**Reglas de negocio:**
- RN-01: El userId siempre se extrae del JWT, nunca del body.

**Notas de implementación:**
- **Backend:** `JwtAuthGuard` en `src/auth/guards/jwt-auth.guard.ts`
- **Strategy:** `JwtStrategy` en `src/auth/strategies/jwt.strategy.ts`

---

### CU-18 — Limpieza nocturna de archivos huérfanos

| Campo | Detalle |
|-------|---------|
| ID | CU-18 |
| Nombre | Limpieza nocturna de archivos huérfanos |
| Actor principal | Sistema |
| Actores secundarios | - |
| Precondición | Tarea programada @Cron a las 2am |
| Postcondición | Archivos huérfanos eliminados del disco |
| Prioridad | Baja |
| Frecuencia | Diaria |

**Flujo principal:**
1. Tarea @Cron a las 2am compara archivos en disco contra registros en BD.
2. Los archivos que no tienen registro son eliminados.
3. Se genera un log de archivos eliminados.

**Flujos alternativos:**
- Ninguno aplicable.

**Reglas de negocio:**
- RN-03: Los archivos se almacenan con nombre uuid.ext.

**Notas de implementación:**
- **Backend:** Tarea @Cron en `src/files/files.service.ts` (por implementar)

---

## 4. Diagrama de actores y relaciones

| Módulo | Ciudadano | Funcionario | Admin | Sistema |
|--------|-----------|-------------|-------|---------|
| Autenticación | ✓ | ✓ | ✓ | ✓ |
| Gestión PQRS | ✓ | ✓ | ✓ | - |
| Panel admin | - | - | ✓ | - |
| Archivos | ✓ | - | ✓ | ✓ |

---

## 5. Relaciones entre casos de uso

| Caso de uso base | Tipo | Caso de uso relacionado |
|------------------|------|------------------------|
| CU-04 Crear PQRS | include | CU-15 Subir archivos |
| CU-04 Crear PQRS | extend | CU-17 Validar token JWT |
| CU-05 Consultar PQRS | extend | CU-17 Validar token JWT |
| CU-06 Ver detalle | extend | CU-17 Validar token JWT |
| CU-11 Responder (admin) | extend | CU-12 Cambiar estado automático |
| CU-15 Subir archivos | extend | CU-17 Validar token JWT |

---

## 6. Reglas de negocio globales

- **RN-01:** El userId siempre se extrae del JWT, nunca del body.
- **RN-02:** Las contraseñas se almacenan con bcrypt (cost 12).
- **RN-03:** Los archivos se almacenan con nombre uuid.ext.
- **RN-04:** La máquina de estados solo permite transiciones válidas.
- **RN-05:** El ciudadano solo ve sus propias PQRS.
- **RN-06:** Un PQRS cerrado no admite más respuestas ni cambios.
- **RN-07:** Variables sensibles (JWT_SECRET, DB_PASSWORD, etc.) solo en .env.
