# Prioridad de solicitudes — Sistema PQRS

## Definición

La prioridad es un atributo clasificatorio que determina el orden de atención, los plazos orientativos de respuesta (SLA) y la visibilidad de cada solicitud en el panel administrativo. En entidades públicas, los ciudadanos tienen derecho a una respuesta oportuna; la prioridad permite que el sistema canalice los recursos hacia los casos más urgentes sin perder trazabilidad ni equidad en la atención.

## Niveles de prioridad

| Nivel   | Valor en BD | Color  | Ícono          | SLA            | Casos típicos                        |
|---------|-------------|--------|----------------|----------------|--------------------------------------|
| Baja    | baja        | Verde  | arrow-down     | 15 días hábiles| Sugerencias, consultas informativas  |
| Media   | media       | Azul   | minus          |  8 días hábiles| Peticiones estándar, trámites        |
| Alta    | alta        | Ámbar  | arrow-up       |  3 días hábiles| Reclamos, afectación de servicios    |
| Urgente | urgente     | Rojo   | alert-triangle | 24 horas       | Riesgo vital, daño irreversible      |

## Reglas de negocio

1. **RN-PRI-01:** El ciudadano puede elegir la prioridad al crear su PQRS. Si no elige, el sistema asigna **media** como valor por defecto.
2. **RN-PRI-02:** El administrador puede cambiar la prioridad en cualquier momento mientras la PQRS no esté **cerrada**, reflejando reclasificación según criterio técnico.
3. **RN-PRI-03:** Nadie puede cambiar la prioridad de una PQRS en estado **cerrado**. El backend responde con `400 Bad Request`.
4. **RN-PRI-04:** El tipo de PQRS sugiere la prioridad mínima en el frontend (reclamo → alta, queja → media, petición → baja por defecto, sugerencia → baja sin URGENTE). Son sugerencias, no restricciones duras: el administrador tiene la última palabra.
5. **RN-PRI-05:** **Urgente** desencadena comportamiento especial: aparece primero en el listado del admin, el badge tiene borde visible y se destaca en el dashboard. En el futuro puede engancharse a notificaciones push.

## Quién puede cambiar la prioridad

| Actor     | ¿Puede asignar al crear? | ¿Puede cambiar después? | Restricciones                          |
|-----------|--------------------------|-------------------------|----------------------------------------|
| Ciudadano | Sí                       | No                      | Solo al registrar la solicitud         |
| Admin     | Sí (vía creación)        | Sí                      | No en PQRS cerradas                    |
| Supervisor| No (mismo rol que ciudadano en PQRS) | No          | —                                      |

## SLA y fechas límite

El campo `fechaLimite` es **virtual** (no se persiste en base de datos). Se calcula en `findOne()` y `findAll()` como `createdAt + SLA` según la prioridad:

| Prioridad | Plazo máximo de respuesta |
|-----------|---------------------------|
| Baja      | 15 días hábiles           |
| Media     | 8 días hábiles            |
| Alta      | 3 días hábiles            |
| Urgente   | 24 horas                  |

**Cálculo de días hábiles:** se cuentan solo lunes a viernes, excluyendo sábados y domingos. Para **urgente** se suman 24 horas corridas desde `createdAt`.

> **Nota v1:** Los feriados nacionales o locales no están implementados; se usa lunes–viernes como aproximación de días hábiles.

## Comportamiento especial de URGENTE

- Ordenamiento prioritario en el listado del administrador (siempre arriba, luego por fecha de creación descendente).
- Badge con borde rojo visible además del fondo de color.
- Métrica destacada en el dashboard: conteo de PQRS urgentes abiertas.
- Hooks futuros para notificaciones push o alertas en tiempo real.

## Relación con el tipo de PQRS

| Tipo de PQRS | Prioridad sugerida | ¿Restricción dura? |
|--------------|--------------------|--------------------|
| Petición     | Media              | No                 |
| Queja        | Media              | No                 |
| Reclamo      | Alta               | No (admin decide)  |
| Sugerencia   | Baja               | No                 |
