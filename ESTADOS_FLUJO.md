# Flujo de estados — Sistema PQRS

## Descripción general

Una máquina de estados es un modelo matemático que define el comportamiento de un sistema mediante un conjunto de estados y transiciones válidas entre ellos. En el contexto del sistema PQRS, la máquina de estados garantiza que cada solicitud siga un ciclo de vida coherente, evitando transiciones incoherentes como pasar de "cerrado" a "pendiente" o de "resuelto" de vuelta a "en proceso".

La implementación de esta máquina de estados proporciona:
- **Consistencia**: Las PQRS siempre siguen el flujo correcto
- **Seguridad**: Solo los administradores pueden cambiar estados manualmente
- **Auditabilidad**: Cada transición está documentada y validada
- **Experiencia de usuario**: El frontend solo muestra opciones válidas

## Estados definidos

| Estado | Valor en BD | Color | Descripción | ¿Estado final? |
|--------|-------------|-------|-------------|----------------|
| PENDIENTE | pendiente | Amarillo (warning) | Estado inicial de toda PQRS recién creada. Nadie ha actuado sobre ella aún. | No |
| EN_PROCESO | en_proceso | Azul (info) | El admin ha tomado la PQRS: la revisó o respondió. Se activa automáticamente cuando el admin envía la primera respuesta. | No |
| RESUELTO | resuelto | Verde (success) | El admin marcó la PQRS como solucionada. El ciudadano puede ver la respuesta final. | No |
| CERRADO | cerrado | Gris (neutral) | Estado final absoluto. No se permiten más acciones: sin nuevas respuestas, sin cambios de estado, sin adjuntos adicionales. | Sí |

## Diagrama de transiciones

```
    [PENDIENTE] ──admin responde──→ [EN_PROCESO]
    [PENDIENTE] ──admin cierra───→ [CERRADO]
    [EN_PROCESO] ─admin resuelve─→ [RESUELTO]
    [EN_PROCESO] ─admin cierra──→ [CERRADO]
    [RESUELTO]  ──confirmar──────→ [CERRADO]
    [CERRADO]   (estado final, sin salida)
```

## Tabla de transiciones válidas

| Estado actual | Estado destino | Quién puede hacerlo | Condición |
|---------------|----------------|---------------------|-----------|
| pendiente | en_proceso | Admin (manual) | Cualquier momento |
| pendiente | en_proceso | Sistema (auto) | Admin responde (T-AUTO-01) |
| pendiente | cerrado | Admin (manual) | Cualquier momento |
| en_proceso | resuelto | Admin (manual) | Cualquier momento |
| en_proceso | cerrado | Admin (manual) | Cualquier momento |
| resuelto | cerrado | Admin (manual) | Cualquier momento |
| cerrado | — | Nadie | Estado final |

## Transiciones implícitas (automáticas)

### T-AUTO-01: Transición automática PENDIENTE → EN_PROCESO

Cuando un administrador envía una respuesta sobre una PQRS en estado `PENDIENTE`, el sistema cambia automáticamente el estado a `EN_PROCESO` sin que el admin tenga que hacerlo manualmente.

**Ubicación del código:**
- Backend: `src/pqrs/pqrs.service.ts` en el método `createRespuesta()`
- Líneas: 278-282

**Código:**
```typescript
// Si es administrador y la PQRS estaba en pendiente, auto-cambiar estado a 'en proceso'
if (esAdmin && pqrs.estado === PqrsStatus.PENDIENTE) {
  pqrs.estado = PqrsStatus.EN_PROCESO;
  await this.pqrsRepository.save(pqrs);
}
```

**Notas:**
- Esta transición se valida con la misma función compartida de transiciones para mantener coherencia
- Se ejecuta dentro de la misma transacción que guarda la respuesta para garantizar atomicidad

## Efectos secundarios

| Transición | Efecto en BD | Efecto en UI | Efecto en sistema |
|------------|--------------|-------------|-------------------|
| PENDIENTE → EN_PROCESO | Actualiza `updatedAt` (timestamp automático) | Badge cambia a azul | (Opcional) Notificar al ciudadano |
| EN_PROCESO → RESUELTO | Registra `resolvedAt` con fecha actual | Badge cambia a verde, muestra fecha de resolución | Calcula tiempo de resolución para estadísticas |
| → CERRADO (cualquier) | No hay cambios adicionales | Oculta formulario de respuesta, deshabilita adjuntar archivos | Bloquea cualquier acción adicional |

## Errores esperados

| Escenario | HTTP status | Mensaje devuelto por la API |
|-----------|-------------|----------------------------|
| Pasar de 'cerrado' a cualquier estado | 400 | "La PQRS se encuentra en estado 'cerrado' (estado final). No se permiten más cambios." |
| Ciudadano intenta cambiar estado | 403 | "Solo los administradores pueden cambiar el estado de una PQRS." |
| Admin pasa de 'resuelto' a 'pendiente' | 400 | "Transición no válida de 'resuelto' a 'pendiente'. Transiciones permitidas: cerrado" |
| Responder en PQRS cerrada | 400 | "Esta PQRS está cerrada y no admite más respuestas." |
| Adjuntar archivo en PQRS cerrada | 400 | "No se pueden adjuntar archivos a una PQRS cerrada." |

## Reglas de negocio asociadas

- **RN-EST-01**: El estado inicial de toda PQRS es siempre 'pendiente'.
- **RN-EST-02**: Solo el rol 'admin' puede cambiar estados manualmente.
- **RN-EST-03**: El sistema puede cambiar estado automáticamente (T-AUTO-01) pero solo siguiendo las transiciones válidas.
- **RN-EST-04**: 'cerrado' es un estado irreversible. No existe mecanismo de reapertura en esta versión.
- **RN-EST-05**: `resolvedAt` se registra únicamente en la transición → resuelto y nunca se sobreescribe.
- **RN-EST-06**: Los ciudadanos pueden responder solo en estados 'pendiente' o 'en_proceso'.
- **RN-EST-07**: Los administradores pueden responder en cualquier estado excepto 'cerrado'.

## Implementación técnica

### Backend (NestJS)

**Archivo de utilidades compartidas:**
- `src/common/utils/pqrs-transitions.ts`

**Métodos afectados:**
- `PqrsService.updateStatus()` - Valida transiciones antes de aplicar cambios
- `PqrsService.createRespuesta()` - Aplica transición automática T-AUTO-01
- `PqrsService.getAttachmentPath()` - Valida que la PQRS no esté cerrada (opcional)

**Entity actualizada:**
- `Pqrs.resolvedAt: Date | null` - Nueva columna nullable

### Frontend (Angular)

**Archivo de utilidades compartidas:**
- `src/app/core/utils/pqrs-transitions.ts`

**Componentes afectados:**
- `PqrsDetailComponent` - Select de estados filtrado por transiciones válidas
- `AdminComponent` - Select de estados filtrado por transiciones válidas
- `PqrsDetailComponent` - Ocultar formulario de respuesta si estado final
- `PqrsDetailComponent` - Deshabilitar adjuntar archivos si estado final

## Pruebas manuales

1. Crear PQRS → verificar que llega en estado 'pendiente'
2. Admin responde → verificar cambio automático a 'en_proceso'
3. Intentar PATCH /status con { estado: 'pendiente' } desde 'cerrado' → esperar 400 con mensaje descriptivo
4. Ciudadano intenta PATCH /status → esperar 403
5. Frontend: verificar que el select solo muestra opciones válidas
6. PQRS cerrada → verificar que el formulario de respuesta desaparece del DOM
