# 📋 Sistema PQRS

Sistema de gestión de **Peticiones, Quejas, Reclamos y Sugerencias** construido con:

| Capa | Tecnología |
|------|-----------|
| Frontend | Angular 21 |
| Backend | NestJS 11 + TypeORM |
| Base de datos | PostgreSQL 16 (Docker) |

---

## 🗂️ Estructura del repositorio

```
brandon/
├── pqrs-backend/      # API REST (NestJS)
├── pqrs-frontend/     # Aplicación web (Angular)
├── docker-compose.yml # PostgreSQL en Docker
├── package.json       # Scripts raíz del monorepo
└── README.md
```

---

## ⚙️ Requisitos previos

- [Node.js](https://nodejs.org/) v20 o superior
- [npm](https://www.npmjs.com/) v9 o superior
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) corriendo

---

## 🚀 Inicio rápido (primera vez)

Desde la **raíz del proyecto** (`brandon/`), ejecuta un único comando:

```bash
npm run setup
```

Esto hace automáticamente:
1. 🐳 Levanta el contenedor de PostgreSQL
2. 📦 Instala dependencias del backend y del frontend
3. 🗄️ Corre las migraciones de base de datos

Luego, para arrancar ambos servidores en paralelo:

```bash
npm start
```

> El backend queda en `http://localhost:3000` y el frontend en `http://localhost:4200`.

---

## 📦 Scripts disponibles

### Instalación de dependencias

| Comando | Descripción |
|---------|-------------|
| `npm run install:all` | Instala dependencias de backend **y** frontend |
| `npm run install:backend` | Solo backend |
| `npm run install:frontend` | Solo frontend |

### 🐳 Base de datos (Docker)

| Comando | Descripción |
|---------|-------------|
| `npm run db:up` | Levanta el contenedor de PostgreSQL en segundo plano |
| `npm run db:down` | Detiene y elimina el contenedor |
| `npm run db:logs` | Muestra los logs en tiempo real del contenedor |

> **Credenciales por defecto** (ver `docker-compose.yml`):
> - Host: `localhost` · Puerto: `5433`
> - Usuario: `pqrs_user` · Contraseña: `pqrs_pass` · DB: `pqrs`

### 🗄️ Migraciones

| Comando | Descripción |
|---------|-------------|
| `npm run migrate` | Ejecuta todas las migraciones pendientes |
| `npm run migrate:revert` | Revierte la última migración aplicada |
| `npm run seed` | Carga datos iniciales (usuarios, roles, etc.) |

> ⚠️ Asegúrate de que el contenedor de Docker esté corriendo (`npm run db:up`) **antes** de ejecutar migraciones.

### ▶️ Desarrollo

| Comando | Descripción |
|---------|-------------|
| `npm start` | Levanta Docker + backend + frontend en paralelo |
| `npm run dev` | Backend y frontend en paralelo (sin tocar Docker) |
| `npm run dev:backend` | Solo backend (modo watch) |
| `npm run dev:frontend` | Solo frontend |

### 🏁 Setup completo

```bash
npm run setup   # db:up + install:all + migrate
npm start       # db:up + dev (backend + frontend)
```

---

## 🔧 Variables de entorno

El backend necesita un archivo `.env`. Cópialo desde el ejemplo:

```bash
cp pqrs-backend/.env.example pqrs-backend/.env
```

Edita `pqrs-backend/.env` con los valores reales. Las variables clave son:

```env
# Base de datos (debe coincidir con docker-compose.yml)
DB_HOST=localhost
DB_PORT=5433
DB_USER=pqrs_user
DB_PASSWORD=pqrs_pass
DB_NAME=pqrs

# JWT
JWT_SECRET=<secreto-seguro>
JWT_REFRESH_SECRET=<secreto-refresh-seguro>

# URL del frontend (para CORS)
FRONTEND_URL=http://localhost:4200
```

---

## 🗄️ Flujo de migraciones (detallado)

Las migraciones están gestionadas con **TypeORM CLI** desde el backend.

### Ver migraciones disponibles

```bash
cd pqrs-backend
npm run typeorm -- migration:show -d src/db/data-source.ts
```

### Generar una nueva migración

```bash
cd pqrs-backend
npm run migration:generate -- src/db/migrations/NombreDeLaMigracion
```

### Aplicar migraciones (desde raíz)

```bash
npm run migrate
```

### Revertir la última migración (desde raíz)

```bash
npm run migrate:revert
```

### Cargar datos semilla

```bash
npm run seed
```

> Los seeders crean los usuarios iniciales del sistema. Revisa [`USUARIOS_SEED.md`](./USUARIOS_SEED.md) para ver las credenciales.

---

## 📡 Endpoints principales

Una vez que el backend está corriendo, la documentación Swagger está disponible en:

```
http://localhost:3000/api
```

---

## 🐛 Solución de problemas frecuentes

### `ECONNREFUSED` al conectar con la base de datos
```bash
# Verifica que Docker esté corriendo
npm run db:up
npm run db:logs   # Espera hasta ver "database system is ready"
```

### Puerto 5433 ocupado
Cambia el puerto externo en `docker-compose.yml`:
```yaml
ports:
  - "5434:5432"   # usa 5434 en vez de 5433
```
Y actualiza `DB_PORT=5434` en `pqrs-backend/.env`.

### Error de migración `relation already exists`
```bash
npm run migrate:revert   # revierte la última
npm run migrate          # vuelve a aplicar
```

### `concurrently: command not found`
```bash
npm install   # instala devDependencies del package.json raíz
```

---

## 📚 Documentación adicional

| Archivo | Contenido |
|---------|-----------|
| [`CASOS_DE_USO.md`](./CASOS_DE_USO.md) | Casos de uso del sistema |
| [`ESTADOS_FLUJO.md`](./ESTADOS_FLUJO.md) | Flujo de estados de una PQRS |
| [`PRIORIDAD.md`](./PRIORIDAD.md) | Criterios de priorización |
| [`SEGURIDAD.md`](./SEGURIDAD.md) | Consideraciones de seguridad |
| [`USUARIOS_SEED.md`](./USUARIOS_SEED.md) | Credenciales de usuarios semilla |
| [`pqrs-backend/FILE_UPLOAD_DOCUMENTATION.md`](./pqrs-backend/FILE_UPLOAD_DOCUMENTATION.md) | Carga de archivos |
