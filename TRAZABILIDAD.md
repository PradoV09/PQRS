# Trazabilidad y auditoría — Sistema PQRS

## ¿Qué es la trazabilidad?

La trazabilidad es el registro inmutable de cada acción relevante sobre una solicitud PQRS: quién la creó, quién cambió su estado o prioridad, quién respondió, quién subió o eliminó archivos, y cuándo ocurrió cada evento. En entidades públicas, este historial es una exigencia derivada de los principios de transparencia y rendición de cuentas consagrados en la Ley 1712 de 2014 (Ley de Transparencia y del Derecho de Acceso a la Información Pública Nacional). Permite demostrar que las solicitudes ciudadanas fueron atendidas de forma oportuna, documentada y verificable.

## Eventos registrados

| Tipo de evento       | Cuándo ocurre                              | Quién puede verlo | Detalle guardado                                      |
|----------------------|--------------------------------------------|-------------------|-------------------------------------------------------|
| `pqrs_creada`        | Al registrar una nueva solicitud             | Ciudadano y admin | título, tipo, prioridad                               |
| `estado_cambiado`    | Cambio manual o automático de estado       | Ciudadano y admin | estado anterior/nuevo, flag `esAutomatico`            |
| `prioridad_cambiada` | Admin modifica la prioridad                | Ciudadano y admin | prioridad anterior/nueva                              |
| `respuesta_agregada` | Se publica una respuesta en el hilo        | Ciudadano y admin | id respuesta, esAdmin, extracto (100 chars)           |
| `archivo_subido`     | Se adjunta un archivo (creación o después)   | Ciudadano y admin | id adjunto, filename, mimetype, sizeBytes             |
| `archivo_eliminado`  | Se elimina un adjunto                      | Solo admin        | id adjunto, filename                                  |
| `pqrs_eliminada`     | Se elimina la solicitud completa           | Solo admin        | título, total adjuntos, total respuestas              |

## Estructura de un evento

Cada registro en `pqrs_historial` contiene:

| Campo         | Descripción                                                                 |
|---------------|-----------------------------------------------------------------------------|
| `id`          | UUID único del evento                                                       |
| `tipoEvento`  | Enum que identifica el tipo de acción                                       |
| `detalle`     | Objeto JSONB con datos específicos según el tipo de evento                  |
| `descripcion` | Texto legible para humanos (ej. "Estado cambiado de 'pendiente' a 'en_proceso'") |
| `createdAt`   | Marca de tiempo del evento (inmutable)                                      |
| `actorNombre` | Nombre del usuario en el momento del evento (desnormalizado)                |
| `actorId`     | UUID del usuario actor (nullable si fue el sistema)                         |
| `pqrsId`      | UUID de la PQRS a la que pertenece el evento                                |

## Principios de inmutabilidad

- Los eventos **nunca** se editan ni se borran manualmente desde la aplicación.
- Solo se eliminan en cascada cuando la PQRS padre se elimina (`ON DELETE CASCADE`).
- **Decisión de diseño v1:** se usa `CASCADE` — al eliminar una PQRS, su historial se borra junto con ella. Esto simplifica la gestión de datos personales (derecho al olvido), pero impide auditoría post-eliminación. Si en el futuro se requiere auditoría permanente, se debe quitar el `CASCADE` y dejar registros huérfanos con `pqrsId` nullable.
- El campo `actorNombre` se desnormaliza al momento del registro para preservar quién hizo qué, incluso si el usuario cambia su nombre posteriormente.

## Quién puede ver el historial

| Actor      | ¿Ve el historial? | Restricciones                                              |
|------------|-------------------|------------------------------------------------------------|
| Ciudadano  | Sí (propias PQRS) | No ve `archivo_eliminado` ni `pqrs_eliminada`              |
| Admin      | Sí (todas)        | Sin filtro — ve todos los eventos                          |
| Supervisor | Sí (propias PQRS) | Misma restricción que ciudadano                            |

## Privacidad

- El ciudadano ve todos los eventos de sus PQRS **excepto** los de borrado de archivos y eliminación de PQRS.
- El administrador ve todos los eventos sin filtro.
- Los eventos no contienen datos sensibles (no se guarda email, contraseña ni documento de identidad).
- Solo se almacena el nombre del actor en el momento del evento.

## Casos de uso en sustentación

Preguntas frecuentes que el historial responde:

1. **¿Quién tomó esta solicitud?** → Buscar el primer evento `estado_cambiado` de `pendiente` a `en_proceso`.
2. **¿Cuándo fue respondida por primera vez?** → Primer evento `respuesta_agregada` en orden cronológico.
3. **¿Alguien subió o borró archivos?** → Eventos `archivo_subido` y `archivo_eliminado`.
4. **¿Se cambió la prioridad? ¿Quién y cuándo?** → Eventos `prioridad_cambiada` con actor y valores anterior/nuevo.
5. **¿Cuánto tardó en resolverse?** → Diferencia entre `pqrs_creada` y el `estado_cambiado` cuyo `estadoNuevo` es `resuelto`.
