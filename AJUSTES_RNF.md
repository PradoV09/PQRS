# Ajustes de Código Requeridos para Cumplimiento de RNF

## A) LO QUE YA ESTÁ IMPLEMENTADO Y CUMPLE EL RNF

### Seguridad (RNF-01)
- **RNF-01.1**: JWT con 15min accessToken y 7d refreshToken en `src/auth/auth.service.ts`
- **RNF-01.2**: bcrypt con cost factor 12 en `src/users/users.service.ts`
- **RNF-01.3**: ValidationPipe global con whitelist: true y forbidNonWhitelisted: true en `src/main.ts`
- **RNF-01.4**: Helmet configurado con CSP en `src/main.ts`
- **RNF-01.8**: Validación mimetype + extensión en `src/pqrs/config/multer.config.ts`, UUID filenames en `src/files/files.service.ts`, validación de permisos en `src/files/files.controller.ts`

### Rendimiento (RNF-02)
- **RNF-02.3**: Índices en migraciones `src/db/migrations/1780080828906-CreatePqrsAndAttachments.ts` y `1780082148088-AddPqrsRespuestas.ts`
- **RNF-02.4**: Thumbnails 128x128 WEBP en `src/files/files.service.ts`

### Disponibilidad (RNF-03)
- **RNF-03.1**: Volumen nombrado `postgres_data` en `docker-compose.yml`
- **RNF-03.3**: Variables en .env y .env.example
- **RNF-03.4**: Logging deshabilitado cuando NODE_ENV=production en `src/db/data-source.ts` y `src/app.module.ts`

### Concurrencia (RNF-05)
- **RNF-05.1**: userId extraído de JWT en `src/pqrs/pqrs.controller.ts` y `src/pqrs/pqrs.service.ts`
- **RNF-05.2**: Validación de transiciones de estado en `src/pqrs/pqrs.service.ts`

### Mantenibilidad (RNF-06)
- **RNF-06.1**: Arquitectura modular con módulos independientes
- **RNF-06.2**: synchronize: false en configuración TypeORM
- **RNF-06.4**: Swagger configurado en `src/main.ts`

---

## B) LO QUE FALTA IMPLEMENTAR

### RNF-01.5 - CORS configurable desde .env

**Archivo**: `src/main.ts`

**Cambio actual**:
```typescript
app.enableCors({
  origin: 'http://localhost:4200',
  credentials: true,
});
```

**Cambio requerido**:
```typescript
const frontendOrigin = configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
app.enableCors({
  origin: frontendOrigin,
  credentials: true,
});
```

---

### RNF-01.6 - Rate limiting específico por endpoint

**Archivo**: `src/app.module.ts`

**Cambio actual**:
```typescript
ThrottlerModule.forRoot([
  {
    ttl: 60000, // 1 minute
    limit: 10,  // 10 requests
  },
]),
```

**Cambio requerido**:
```typescript
ThrottlerModule.forRoot([
  {
    name: 'auth',
    ttl: 60000, // 1 minute
    limit: 10,  // 10 requests per minute for /auth
  },
  {
    name: 'pqrs',
    ttl: 60000, // 1 minute
    limit: 5,   // 5 creations per minute for /pqrs
  },
  {
    name: 'files',
    ttl: 3600000, // 1 hour
    limit: 10,      // 10 uploads per hour for /files
  },
]),
```

**Archivos adicionales a modificar**:
- `src/auth/auth.controller.ts`: Agregar `@Throttle('auth')` a los endpoints
- `src/pqrs/pqrs.controller.ts`: Agregar `@Throttle('pqrs')` al endpoint POST
- `src/files/files.controller.ts`: Agregar `@Throttle('files')` a los endpoints de subida

---

### RNF-01.7 - Eliminar valores por defecto hardcodeados

**Archivo**: `src/auth/auth.service.ts`

**Cambio actual**:
```typescript
const accessToken = await this.jwtService.signAsync(payload, {
  secret: this.configService.get<string>('JWT_SECRET') || 'cambia_esto_por_un_secreto_seguro_de_al_menos_32_chars',
  expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') || '15m') as any,
});

const refreshToken = await this.jwtService.signAsync(payload, {
  secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'otro_secreto_diferente_para_refresh',
  expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as any,
});
```

**Cambio requerido**:
```typescript
const jwtSecret = this.configService.get<string>('JWT_SECRET');
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}

const jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
if (!jwtRefreshSecret) {
  throw new Error('JWT_REFRESH_SECRET environment variable is required');
}

const accessToken = await this.jwtService.signAsync(payload, {
  secret: jwtSecret,
  expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') || '15m') as any,
});

const refreshToken = await this.jwtService.signAsync(payload, {
  secret: jwtRefreshSecret,
  expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as any,
});
```

---

### RNF-02.2 - Validar límite máximo de paginación

**Archivo**: `src/pqrs/dto/pqrs-query.dto.ts`

**Cambio actual**:
```typescript
export class PqrsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
```

**Cambio requerido**:
```typescript
export class PqrsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number;
}
```

**Archivo**: `src/pqrs/pqrs.service.ts`

**Cambio en método findAll**:
```typescript
const {
  tipo,
  estado,
  page = 1,
  limit = 10,
  search,
  userId: filterUserId,
  fechaDesde,
  fechaHasta,
  sortBy = 'createdAt',
  sortOrder = 'DESC',
} = queryDto;

// Validar límite máximo
const maxLimit = 50;
const effectiveLimit = Math.min(limit, maxLimit);
```

---

### RNF-02.5 - Implementar debounce en filtros de búsqueda (Frontend)

**Archivo**: `src/app/features/pqrs/pqrs-list/pqrs-list.component.ts`

**Cambio requerido**:
```typescript
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

export class PqrsListComponent implements OnInit {
  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.applyFilters({ search: searchTerm });
    });
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }
}
```

---

### RNF-03.2 - Mapear uploads como volumen en Docker

**Archivo**: `docker-compose.yml`

**Cambio actual**:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: pqrs_postgres
    environment:
      POSTGRES_USER: pqrs_user
      POSTGRES_PASSWORD: pqrs_pass
      POSTGRES_DB: pqrs
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Cambio requerido**:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: pqrs_postgres
    environment:
      POSTGRES_USER: pqrs_user
      POSTGRES_PASSWORD: pqrs_pass
      POSTGRES_DB: pqrs
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    # ... configuración del backend
    volumes:
      - ./uploads:/app/uploads

volumes:
  postgres_data:
  uploads_data:
```

---

### RNF-04.2 - Agregar atributos ARIA a formularios (Frontend)

**Archivo**: `src/app/features/pqrs/create-pqrs/create-pqrs.component.html`

**Cambio requerido**:
```html
<form [formGroup]="pqrsForm" (ngSubmit)="onSubmit()" aria-label="Formulario de creación de PQRS">
  <div class="form-group">
    <label for="titulo" class="form-label">Título</label>
    <input 
      id="titulo"
      formControlName="titulo" 
      class="form-control" 
      aria-required="true"
      aria-describedby="titulo-error"
    >
    @if (pqrsForm.get('titulo')?.invalid && pqrsForm.get('titulo')?.touched) {
      <div id="titulo-error" class="error-message" role="alert" aria-live="polite">
        El título es obligatorio
      </div>
    }
  </div>
  <!-- ... resto del formulario ... -->
</form>
```

---

### RNF-04.3 - Implementar skeleton/shimmer y spiners (Frontend)

**Archivo**: `src/app/shared/components/skeleton/skeleton.component.ts` (NUEVO ARCHIVO)

**Código requerido**:
```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div class="skeleton-loader">
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
    </div>
  `,
  styles: [`
    .skeleton-loader {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .skeleton-line {
      height: 16px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `]
})
export class SkeletonComponent {}
```

---

### RNF-04.4 - Prevenir doble envío en formularios (Frontend)

**Archivo**: `src/app/features/pqrs/create-pqrs/create-pqrs.component.ts`

**Cambio requerido**:
```typescript
export class CreatePqrsComponent {
  submitting = signal(false);

  async onSubmit(): Promise<void> {
    if (this.submitting()) return;
    
    this.submitting.set(true);
    
    try {
      await this.createPqrs();
    } finally {
      this.submitting.set(false);
    }
  }
}
```

**Archivo**: `src/app/features/pqrs/create-pqrs/create-pqrs.component.html`

**Cambio requerido**:
```html
<button 
  type="submit" 
  class="btn-submit"
  [disabled]="submitting() || pqrsForm.invalid"
  [attr.aria-busy]="submitting()"
>
  @if (submitting()) {
    <span class="spinner"></span>
  }
  @if (!submitting()) {
    Enviar
  }
</button>
```

---

### RNF-05.3 - Configurar pool de conexiones TypeORM

**Archivo**: `src/db/data-source.ts`

**Cambio actual**:
```typescript
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'pqrs_user',
  password: process.env.DB_PASSWORD || 'pqrs_pass',
  database: process.env.DB_NAME || 'pqrs',
  entities: [path.join(__dirname, '../**/*.entity.{js,ts}')],
  migrations: [path.join(__dirname, './migrations/*.{js,ts}')],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
});
```

**Cambio requerido**:
```typescript
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'pqrs_user',
  password: process.env.DB_PASSWORD || 'pqrs_pass',
  database: process.env.DB_NAME || 'pqrs',
  entities: [path.join(__dirname, '../**/*.entity.{js,ts}')],
  migrations: [path.join(__dirname, './migrations/*.{js,ts}')],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  extra: {
    max: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '10000', 10),
  },
});
```

---

### RNF-06.3 - Actualizar .env.example con todas las variables

**Archivo**: `.env.example` (actualización en siguiente sección)
