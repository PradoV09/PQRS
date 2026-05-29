# Requisitos No Funcionales — Sistema PQRS

## Introducción

Los requisitos no funcionales (RNF) definen cómo el sistema debe comportarse en lugar de qué debe hacer. Estos requisitos son críticos para garantizar la seguridad, rendimiento, disponibilidad, mantenibilidad y escalabilidad del sistema PQRS. Este documento documenta todos los RNF del sistema, su estado de implementación actual y los ajustes necesarios para cumplirlos completamente.

---

## 1. Seguridad (RNF-01)

| ID | Descripción | Cómo se cumple en el sistema | Verificación |
|----|-------------|------------------------------|--------------|
| RNF-01.1 | Autenticación mediante JWT con accessToken de 15 min y refreshToken de 7 días. Nunca exponer el token en la URL ni en logs. | **PARCIALMENTE IMPLEMENTADO**: JWT configurado con 15min access y 7d refresh en `auth.service.ts`. Los tokens no se exponen en URLs. | Verificar que no haya logs con tokens. |
| RNF-01.2 | Contraseñas almacenadas con bcrypt, cost factor ≥ 12. Nunca retornar el hash en ninguna respuesta de la API. | **IMPLEMENTADO**: bcrypt con cost factor 12 en `users.service.ts`. User entity usa `@Exclude()` en passwordHash. | Verificar que passwordHash no esté en respuestas API. |
| RNF-01.3 | Todos los inputs validados y saneados con class-validator (whitelist: true, forbidNonWhitelisted: true). | **IMPLEMENTADO**: ValidationPipe global con whitelist: true y forbidNonWhitelisted: true en `main.ts`. | Verificar que DTOs usen decoradores de validación. |
| RNF-01.4 | Headers HTTP de seguridad configurados con helmet(): X-Content-Type-Options, X-Frame-Options, HSTS, etc. | **IMPLEMENTADO**: Helmet configurado en `main.ts` con CSP personalizado para Swagger. | Verificar headers de seguridad con curl -I. |
| RNF-01.5 | CORS restringido solo al origen del frontend (http://localhost:4200 en desarrollo; configurable en .env). | **PARCIALMENTE IMPLEMENTADO**: CORS configurado para localhost:4200 en `main.ts`, pero no es configurable desde .env. | Cambiar origen a variable de entorno. |
| RNF-01.6 | Rate limiting: máx 10 req/min en /auth, máx 5 creaciones/min en /pqrs, máx 10 subidas/hora en endpoints de archivos. Usar @nestjs/throttler. | **PARCIALMENTE IMPLEMENTADO**: ThrottlerModule configurado globalmente con 10 req/min en `app.module.ts`. No hay límites específicos por endpoint. | Implementar límites específicos por endpoint. |
| RNF-01.7 | Variables sensibles (JWT_SECRET, DB_PASSWORD, etc.) solo en .env. Nunca hardcodeadas en el código fuente. | **PARCIALMENTE IMPLEMENTADO**: Variables en .env, pero hay valores por defecto hardcodeados en `auth.service.ts`. | Eliminar valores por defecto hardcodeados. |
| RNF-01.8 | Archivos subidos: verificar mimetype + extensión. Almacenar con nombre uuid.ext generado por el servidor, nunca el nombre original. Endpoint de descarga valida permisos antes de servir el archivo. | **IMPLEMENTADO**: Validación mimetype + extensión en `multer.config.ts`. UUID generado por servidor. Permisos validados en `files.controller.ts`. | Verificar que archivos tengan nombres UUID. |

---

## 2. Rendimiento (RNF-02)

| ID | Descripción | Cómo se cumple en el sistema | Verificación |
|----|-------------|------------------------------|--------------|
| RNF-02.1 | Tiempo de respuesta de la API menor a 3 segundos para el 95% de las peticiones bajo carga normal. | **NO IMPLEMENTADO**: No hay monitoreo de rendimiento ni SLA definido. | Implementar monitoreo de rendimiento. |
| RNF-02.2 | Paginación obligatoria en todos los listados (máx 50 registros por página) para evitar transferencia masiva de datos. | **PARCIALMENTE IMPLEMENTADO**: Paginación implementada en `pqrs.service.ts` con default 10, pero no hay límite máximo de 50. | Agregar validación de límite máximo. |
| RNF-02.3 | Índices en BD sobre las columnas más consultadas: pqrs.userId, pqrs.estado, pqrs.tipo, pqrs.createdAt, pqrs_attachments.pqrsId, pqrs_respuestas.pqrsId. | **IMPLEMENTADO**: Índices creados en migraciones `1780080828906-CreatePqrsAndAttachments.ts` y `1780082148088-AddPqrsRespuestas.ts`. | Ejecutar SELECT indexname, tablename FROM pg_indexes. |
| RNF-02.4 | Las imágenes adjuntas tienen thumbnail 128x128 WEBP para la galería, evitando cargar archivos originales en el listado. | **IMPLEMENTADO**: Thumbnails generados con Sharp en `files.service.ts` (128x128 WEBP). | Verificar que thumbnails existan en uploads/pqrs/thumbs/. |
| RNF-02.5 | El frontend aplica debounce (≥ 300 ms) en los filtros de búsqueda en tiempo real para reducir peticiones. | **NO IMPLEMENTADO**: No hay debounce en filtros de búsqueda del frontend. | Implementar debounce en componentes de búsqueda. |

---

## 3. Disponibilidad y Respaldo (RNF-03)

| ID | Descripción | Cómo se cumple en el sistema | Verificación |
|----|-------------|------------------------------|--------------|
| RNF-03.1 | Base de datos PostgreSQL con volumen Docker nombrado para persistencia de datos entre reinicios del contenedor. | **IMPLEMENTADO**: Volumen nombrado `postgres_data` en `docker-compose.yml`. | Verificar que datos persistan al reiniciar contenedor. |
| RNF-03.2 | La carpeta uploads/ debe estar fuera del contenedor o mapeada como volumen para que los archivos persistan ante reinicios. | **NO IMPLEMENTADO**: uploads/ no está mapeado como volumen en `docker-compose.yml`. | Agregar volumen para uploads en docker-compose.yml. |
| RNF-03.3 | Variables de entorno en .env para permitir cambiar host, puerto, base de datos y credenciales sin tocar el código fuente. | **IMPLEMENTADO**: Variables en .env y .env.example. | Verificar que todas las variables necesarias estén documentadas. |
| RNF-03.4 | En producción: NODE_ENV=production deshabilita mensajes de error detallados y stack traces en las respuestas de la API. | **IMPLEMENTADO**: Logging deshabilitado cuando NODE_ENV=production en `data-source.ts` y `app.module.ts`. | Verificar que no haya stack traces en producción. |

---

## 4. Usabilidad y Accesibilidad (RNF-04)

| ID | Descripción | Cómo se cumple en el sistema | Verificación |
|----|-------------|------------------------------|--------------|
| RNF-04.1 | Interfaz responsive (mobile-first) compatible con Chrome ≥ 110, Firefox ≥ 110, Safari ≥ 16, Edge ≥ 110. No se requiere soporte de IE. | **PARCIALMENTE IMPLEMENTADO**: CSS responsive en componentes, pero no hay verificación de compatibilidad de navegadores. | Verificar compatibilidad con navegadores objetivo. |
| RNF-04.2 | Todos los formularios accesibles por teclado. Botones e inputs con aria-label descriptivo. Mensajes de error y estados vacíos anunciados con aria-live="polite". | **NO IMPLEMENTADO**: No hay atributos ARIA en formularios ni aria-live para mensajes de error. | Agregar atributos ARIA a componentes. |
| RNF-04.3 | Feedback visual inmediato en toda acción del usuario: spinner en botones durante peticiones, toasts de éxito y error, skeleton/shimmer durante carga de datos. | **PARCIALMENTE IMPLEMENTADO**: ToastService implementado, pero no hay skeleton/shimmer ni spiners en botones. | Implementar skeleton y spiners. |
| RNF-04.4 | Los formularios previenen doble envío: deshabilitar el botón y el form durante la petición en curso. | **NO IMPLEMENTADO**: No hay prevención de doble envío en formularios. | Implementar deshabilitación de botones durante petición. |

---

## 5. Concurrencia y Escalabilidad (RNF-05)

| ID | Descripción | Cómo se cumple en el sistema | Verificación |
|----|-------------|------------------------------|--------------|
| RNF-05.1 | El sistema debe soportar múltiples usuarios concurrentes sin condiciones de carrera en la creación de PQRS. El userId se extrae siempre del token JWT, nunca del body. | **IMPLEMENTADO**: userId extraído de JWT en `pqrs.controller.ts` y `pqrs.service.ts`. Nunca del body. | Verificar que userId no se acepte del body. |
| RNF-05.2 | La máquina de estados de PQRS (pendiente → en_proceso → resuelto | cerrado) se valida en el backend en cada transición para garantizar consistencia aunque haya peticiones simultáneas. | **IMPLEMENTADO**: Validación de transiciones de estado en `pqrs.service.ts` con máquina de estados. | Verificar que transiciones inválidas sean rechazadas. |
| RNF-05.3 | TypeORM con pool de conexiones a PostgreSQL (configurar connectionTimeout y maxConnections en .env). | **NO IMPLEMENTADO**: No hay configuración de pool de conexiones en TypeORM. | Agregar configuración de pool en data-source.ts. |

---

## 6. Mantenibilidad (RNF-06)

| ID | Descripción | Cómo se cumple en el sistema | Verificación |
|----|-------------|------------------------------|--------------|
| RNF-06.1 | Arquitectura modular en NestJS: cada módulo (auth, users, pqrs, files) es independiente con sus propias entidades, servicios y controladores. | **IMPLEMENTADO**: Módulos independientes en `auth/`, `users/`, `pqrs/`, `files/`. | Verificar que cada módulo sea independiente. |
| RNF-06.2 | Migraciones TypeORM para gestión de esquema de BD. synchronize: false en todos los entornos. | **IMPLEMENTADO**: Migraciones en `src/db/migrations/`. synchronize: false en configuración. | Verificar que no haya synchronize: true. |
| RNF-06.3 | Variables de entorno documentadas en .env.example con descripción de cada clave. | **PARCIALMENTE IMPLEMENTADO**: .env.example existe pero falta documentación de algunas variables nuevas. | Actualizar .env.example con todas las variables. |
| RNF-06.4 | Swagger disponible en /api/docs con todos los endpoints, esquemas de request/response y códigos de error documentados. | **IMPLEMENTADO**: Swagger configurado en `main.ts` con Bearer auth. | Verificar que todos los endpoints estén documentados. |

---

## Tabla Resumen

| ID | Categoría | Prioridad | Estado |
|----|-----------|-----------|--------|
| RNF-01.1 | Seguridad | Alta | Implementado |
| RNF-01.2 | Seguridad | Alta | Implementado |
| RNF-01.3 | Seguridad | Alta | Implementado |
| RNF-01.4 | Seguridad | Alta | Implementado |
| RNF-01.5 | Seguridad | Alta | Pendiente |
| RNF-01.6 | Seguridad | Alta | Pendiente |
| RNF-01.7 | Seguridad | Alta | Pendiente |
| RNF-01.8 | Seguridad | Alta | Implementado |
| RNF-02.1 | Rendimiento | Media | Pendiente |
| RNF-02.2 | Rendimiento | Alta | Pendiente |
| RNF-02.3 | Rendimiento | Alta | Implementado |
| RNF-02.4 | Rendimiento | Media | Implementado |
| RNF-02.5 | Rendimiento | Media | Pendiente |
| RNF-03.1 | Disponibilidad | Alta | Implementado |
| RNF-03.2 | Disponibilidad | Alta | Pendiente |
| RNF-03.3 | Disponibilidad | Alta | Implementado |
| RNF-03.4 | Disponibilidad | Alta | Implementado |
| RNF-04.1 | Usabilidad | Media | Pendiente |
| RNF-04.2 | Usabilidad | Media | Pendiente |
| RNF-04.3 | Usabilidad | Media | Pendiente |
| RNF-04.4 | Usabilidad | Media | Pendiente |
| RNF-05.1 | Concurrencia | Alta | Implementado |
| RNF-05.2 | Concurrencia | Alta | Implementado |
| RNF-05.3 | Concurrencia | Media | Pendiente |
| RNF-06.1 | Mantenibilidad | Alta | Implementado |
| RNF-06.2 | Mantenibilidad | Alta | Implementado |
| RNF-06.3 | Mantenibilidad | Media | Pendiente |
| RNF-06.4 | Mantenibilidad | Media | Implementado |

---

## Glosario

- **JWT (JSON Web Token)**: Token estándar para autenticación que contiene claims codificados en JSON.
- **bcrypt**: Algoritmo de hashing de contraseñas con factor de coste ajustable para resistencia a ataques de fuerza bruta.
- **Rate limiting**: Técnica para limitar la frecuencia de peticiones de un usuario o IP para prevenir abuso.
- **CORS (Cross-Origin Resource Sharing)**: Mecanismo de seguridad HTTP que permite o restringe peticiones cross-origin.
- **Helmet**: Middleware de Express para configurar headers HTTP de seguridad.
- **HSTS (HTTP Strict Transport Security)**: Header que fuerza el uso de HTTPS.
- **XSS (Cross-Site Scripting)**: Vulnerabilidad que permite inyectar scripts maliciosos en páginas web.
- **Debounce**: Técnica para retrasar la ejecución de una función hasta que pase un tiempo desde la última invocación.
