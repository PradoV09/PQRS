# Checklist de Prueba para Verificar RNF Críticos

## Escenario 1: Verificar Seguridad de JWT (RNF-01.1, RNF-01.2)

**Objetivo**: Validar que los tokens JWT tengan el tiempo de expiración correcto y las contraseñas estén hasheadas con bcrypt cost ≥ 12.

**Pasos**:
1. Registrar un nuevo usuario:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"nombre":"Test User","email":"test@example.com","password":"TestPass123!"}'
   ```
2. Verificar que la respuesta contenga `accessToken` y `refreshToken`
3. Decodificar el accessToken (usar jwt.io) y verificar que `exp` sea ~15 minutos desde `iat`
4. Verificar que `refreshToken` tenga expiración de ~7 días
5. Consultar la base de datos y verificar que el campo `passwordHash` no sea texto plano
6. Verificar que la respuesta API nunca incluya `passwordHash`

**Resultado esperado**: Tokens con expiración correcta, contraseña hasheada, hash nunca expuesto.

---

## Escenario 2: Verificar Rate Limiting (RNF-01.6)

**Objetivo**: Validar que los límites de tasa por endpoint funcionen correctamente.

**Pasos**:
1. Probar endpoint /auth (límite: 10 req/min):
   ```bash
   for i in {1..11}; do
     curl -X POST http://localhost:3000/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com","password":"TestPass123!"}'
     echo "Request $i completed"
   done
   ```
2. Verificar que la petición 11 retorne 429 (Too Many Requests)
3. Probar endpoint POST /pqrs (límite: 5 req/min) con token válido
4. Verificar que la petición 6 retorne 429
5. Probar endpoint de subida de archivos (límite: 10/hora)
6. Verificar que después de 10 subidas se retorne 429

**Resultado esperado**: Límites de tasa respetados por endpoint, código 429 cuando se excede.

---

## Escenario 3: Verificar Validación de Inputs (RNF-01.3)

**Objetivo**: Validar que todos los inputs sean validados y saneados con whitelist.

**Pasos**:
1. Enviar una petición POST /pqrs con campos extra no definidos en el DTO:
   ```bash
   curl -X POST http://localhost:3000/api/pqrs \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{"titulo":"Test","descripcion":"Test","tipo":"peticion","campo_malicioso":"valor"}'
   ```
2. Verificar que la respuesta sea 400 (Bad Request) indicando campo no permitido
3. Enviar una petición con campos faltantes requeridos
4. Verificar que la respuesta sea 400 con mensajes de validación
5. Intentar inyección SQL en campos de texto
6. Verificar que la inyección sea rechazada o saneada

**Resultado esperado**: Campos extra rechazados, validación estricta, inputs saneados.

---

## Escenario 4: Verificar Headers de Seguridad (RNF-01.4)

**Objetivo**: Validar que los headers HTTP de seguridad estén configurados correctamente.

**Pasos**:
1. Ejecutar:
   ```bash
   curl -I http://localhost:3000/api
   ```
2. Verificar que los siguientes headers estén presentes:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY` o `SAMEORIGIN`
   - `Strict-Transport-Security` (si es HTTPS)
   - `Content-Security-Policy`
3. Verificar que no haya headers que expongan información sensible (X-Powered-By, Server)

**Resultado esperado**: Todos los headers de seguridad presentes, headers informativos eliminados.

---

## Escenario 5: Verificar Máquina de Estados de PQRS (RNF-05.2)

**Objetivo**: Validar que las transiciones de estado sigan la máquina de estados definida.

**Pasos**:
1. Crear una PQRS (estado inicial: pendiente)
2. Intentar cambiar estado a `en_proceso` (debe ser válido)
3. Intentar cambiar estado a `resuelto` desde `pendiente` (debe ser inválido)
4. Cambiar a `en_proceso` y luego a `resuelto` (debe ser válido)
5. Intentar cambiar estado desde `resuelto` a `pendiente` (debe ser inválido)
6. Cambiar a `cerrado` desde cualquier estado excepto `cerrado` (debe ser válido)
7. Intentar cambiar estado desde `cerrado` (debe ser inválido)

**Resultado esperado**: Solo transiciones válidas permitidas, transiciones inválidas rechazadas con 400.

---

## Escenario 6: Verificar Paginación y Límite Máximo (RNF-02.2)

**Objetivo**: Validar que la paginación funcione y que el límite máximo de 50 registros sea respetado.

**Pasos**:
1. Solicitar listado sin paginación:
   ```bash
   curl -X GET "http://localhost:3000/api/pqrs" \
     -H "Authorization: Bearer <token>"
   ```
2. Verificar que por defecto retorne 10 registros (page=1, limit=10)
3. Solicitar con limit=100:
   ```bash
   curl -X GET "http://localhost:3000/api/pqrs?limit=100" \
     -H "Authorization: Bearer <token>"
   ```
4. Verificar que el sistema aplique el límite máximo de 50
5. Verificar que la respuesta incluya metadata: total, page, limit, totalPages
6. Navegar entre páginas (page=1, page=2, etc.)
7. Verificar que los datos sean consistentes y no haya duplicados

**Resultado esperado**: Paginación funcional, límite máximo de 50 respetado, metadata correcta.

---

## Comando para Verificar Índices en PostgreSQL

```sql
-- Ejecutar en la base de datos PostgreSQL
SELECT 
  indexname, 
  tablename 
FROM pg_indexes 
WHERE tablename IN ('pqrs', 'pqrs_attachments', 'pqrs_respuestas')
ORDER BY tablename, indexname;
```

**Resultado esperado**:
- `pqrs`: IDX_pqrs_userId, IDX_pqrs_tipo, IDX_pqrs_estado, IDX_pqrs_createdAt
- `pqrs_attachments`: IDX_pqrs_attachments_pqrsId
- `pqrs_respuestas`: IDX_pqrs_respuestas_pqrsId, IDX_pqrs_respuestas_autorId, IDX_pqrs_respuestas_createdAt

---

## Comando para Verificar Configuración de Pool de Conexiones

```sql
-- Ejecutar en la base de datos PostgreSQL
SELECT 
  setting,
  unit
FROM pg_settings 
WHERE name IN ('max_connections', 'shared_buffers', 'effective_cache_size');
```

---

## Comando para Verificar Persistencia de Datos en Docker

```bash
# Detener contenedor
docker-compose down

# Reiniciar contenedor
docker-compose up -d

# Verificar que datos persistan
docker exec -it pqrs_postgres psql -U pqrs_user -d pqrs -c "SELECT COUNT(*) FROM pqrs;"
```

**Resultado esperado**: El conteo de PQRS debe ser el mismo antes y después del reinicio.
