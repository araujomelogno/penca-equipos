# Perfil de usuario

## 1. Objetivo
Gestionar la identidad del usuario: perfil, avatar y contraseña.

## 2. Problema que resuelve
Permitir que cada usuario personalice su identidad dentro de la penca — cambiar su nombre, elegir un avatar de la galería o subir una foto propia, y actualizar su contraseña cuando lo desee.

## 3. Usuarios y roles
| Rol | Capacidades |
|-----|------------|
| Usuario | Editar perfil (nickname, fullName, favoriteTeam), cambiar avatar (galería o foto), cambiar contraseña |

## 4. Alcance
**Dentro del alcance:**
- Edición de perfil (nickname, fullName, favoriteTeam)
- Subida de foto de perfil
- Selección de avatar predefinido (galería de opciones)
- Cambio de contraseña

**Fuera del alcance:**
- Cambio de email
- Eliminación de cuenta

## 5. Flujos principales

### 5.1 Editar perfil
1. Usuario accede a `/profile`
2. Puede:
   - Cambiar nickname
   - Cambiar nombre completo (fullName)
   - Ver su email (read-only)
   - Seleccionar un avatar predefinido de la galería
   - Subir una foto de perfil (reemplaza el avatar)
3. PUT `/api/profile` valida y actualiza en DB
4. Si sube foto: se sube al storage, se guarda la URL resultante en `avatarUrl`

### 5.2 Cambiar contraseña
1. Usuario accede a `/profile` → sección "Change Password"
2. Ingresa contraseña actual y nueva contraseña
3. PUT `/api/profile/password` valida contraseña actual, hashea la nueva y actualiza en DB
4. Confirmación visual en pantalla

## 6. Pantallas del módulo

### 6.1 Perfil
- **Ruta:** `/profile`
- **Componente:** `src/app/(main)/profile/page.tsx`
- **Acceso:** Usuario autenticado
- **Elementos UI:**
  - Título "Edit Profile" + subtítulo descriptivo
  - Card principal con 2 columnas:
    - Izquierda: Avatar actual (grande, circular), botón "Change Photo" (dorado), nota "JPG, PNG or WebP. Max 5MB."
    - Derecha: Formulario con campos NICKNAME, FULL NAME (editables), EMAIL ADDRESS (read-only), botones "Save Changes" (dorado) + "Cancel"
  - Galería de avatares predefinidos (grid clickeable) — accesible desde el botón Change Photo
  - Card "Change Password": ícono llave + título + descripción + link "Update Password"
- **Endpoints:**
  - `PUT /api/profile` — actualizar nickname, fullName y/o avatar
  - `POST /api/profile/avatar` — subir foto de perfil
  - `PUT /api/profile/password` — cambiar contraseña

## 7. Reglas de negocio
- **BR-01:** Al registrarse, se asigna un avatar predefinido al azar de la galería disponible (ver [specs/auth.md]).
- **BR-02:** Las fotos de perfil aceptan jpg, png, webp con máximo 5MB.
- **BR-03:** Para cambiar contraseña, el usuario debe ingresar la contraseña actual correctamente.
- **BR-04:** La nueva contraseña debe cumplir los mismos requisitos que en el registro (mínimo 6 caracteres).

## 8. Estados y transiciones
N/A — El perfil no tiene estados propios. El usuario siempre puede editarlo mientras su cuenta esté activa.

## 9. Datos principales

#### User (definido en [specs/auth.md])
Campos relevantes para este módulo:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| nickname | String (unique) | Nombre público |
| fullName | String? | Nombre completo del usuario |
| avatarUrl | String? | URL de avatar (foto subida o avatar predefinido) |
| avatarPreset | String? | ID del avatar predefinido seleccionado (null si subió foto) |
| passwordHash | String | Hash bcrypt de la contraseña |

Para el modelo completo de User, ver [specs/auth.md] sección 9.

#### Avatares predefinidos (constante, no en DB)
12 avatares SVG de pulpos temáticos almacenados en `/public/avatars/`. Definidos en `src/lib/avatarPresets.ts`. Cada uno tiene un ID (ej: `octopus-gold`, `octopus-blue`), un path al SVG y un label. Generados con `scripts/generate-avatars.ts`.

| ID | Color | Personalidad |
|----|-------|-------------|
| octopus-gold | Dorado | Sonriente, con spots (matchea el logo) |
| octopus-blue | Azul océano | Feliz, con rubor |
| octopus-coral | Coral/rosa | Sacando la lengua, con rubor |
| octopus-purple | Violeta | Pícaro, con gorro de mago |
| octopus-green | Verde | Sonriente, con spots |
| octopus-red | Rojo | Pícaro, con gorro pirata |
| octopus-teal | Teal | Sonriente, con anteojos |
| octopus-orange | Naranja | Boca abierta, con spots |
| octopus-pink | Rosa | Feliz, con corona |
| octopus-navy | Índigo | Sonriente, con moño |
| octopus-mint | Menta | Sorprendido, con rubor |
| octopus-lavender | Lavanda | Feliz, con gorro de chef |

Se referencian por el campo `avatarPreset` del User. Al registrarse se asigna uno al azar; el usuario puede cambiarlo desde la galería en `/profile`.

## 10. Integraciones
- **File storage** — Para fotos de perfil (servicio por definir: local filesystem, S3, Cloudflare R2, etc.)
- **bcryptjs** — Hashing de contraseña nueva al cambiar contraseña (cost factor 10)
- Depende de: [specs/auth.md] (modelo User, sesión JWT)

## 11. Errores y validaciones
| Código | Condición | Mensaje |
|--------|----------|---------|
| 400 | Foto > 5MB | "La imagen no puede superar 5MB" |
| 400 | Formato de foto no soportado | "Formato no soportado. Usá JPG, PNG o WebP" |
| 400 | Contraseña actual incorrecta | "La contraseña actual es incorrecta" |
| 400 | Nueva contraseña < 6 chars | "La nueva contraseña debe tener al menos 6 caracteres" |
| 409 | Nickname ya existe | "El nickname ya está en uso" |

## 12. Casos especiales
- Si no hay avatares predefinidos configurados, el usuario se crea sin avatar (fallback a inicial del nickname).
- Al subir foto, se redimensiona/comprime en el server si excede dimensiones razonables (ej: max 256x256).

## 13. Decisiones de diseño
- **Avatares predefinidos + foto:** Los avatares predefinidos dan una experiencia inmediata sin fricción (avatar asignado al azar al registrarse). La opción de subir foto es para quienes quieren personalizar más.
- **avatarPreset vs avatarUrl:** Se separan en dos campos para distinguir si el usuario tiene un preset (referencia a archivo local) o una foto subida (URL al storage). La sesión resuelve esto a un solo `image` URL.
- **Separación de auth y profile:** El registro y login son responsabilidad de auth. La personalización del perfil (avatar, nickname, contraseña) se gestiona en este módulo separado.
