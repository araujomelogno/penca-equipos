# Autenticación

## 1. Objetivo
Gestionar el registro, inicio de sesión y sesión de usuarios en la plataforma Pencachi. El acceso es por invitación — se comparte un link con código de invitación (ej: vía WhatsApp) y múltiples personas pueden registrarse con el mismo código mientras esté activo.

## 2. Problema que resuelve
Controlar quién puede participar en la penca, manteniendo una comunidad cerrada. El admin comparte un link de invitación al grupo, puede revocarlo en cualquier momento y generar uno nuevo. También puede desactivar cuentas que considere no válidas. El OTP por email resuelve el caso común de usuarios que olvidan su contraseña.

## 3. Usuarios y roles
| Rol | Capacidades |
|-----|------------|
| Anónimo | Ver pantalla de login/registro |
| Usuario | Registrarse (con código), iniciar sesión (password u OTP), gestionar su propia cuenta (perfil, contraseña, eliminación), cerrar sesion |
| Admin | Todo lo anterior + gestionar códigos de invitación (crear, desactivar) + desactivar/reactivar cuentas de usuario |

## 4. Alcance
**Dentro del alcance:**
- Registro con código de invitación compartido (multi-uso)
- Login con email/contraseña
- Login con OTP por email (alternativa a contraseña)
- Gestión de sesión JWT
- Asignación aleatoria de avatar al registro
- Generación y desactivación de códigos de invitación (admin)
- Desactivación/reactivación de cuentas de usuario (admin)

**Fuera del alcance:**
- OAuth / login social
- Verificación de email
- 2FA permanente (el OTP es solo para login, no es un segundo factor)

## 5. Flujos principales

### 5.1 Registro
1. Usuario recibe un link de invitación (ej: `pencachi.com/register?code=ABC123`) vía WhatsApp u otro medio
2. Accede al link → se pre-llena el código de invitación
3. Ingresa email, contraseña y nickname
4. Sistema valida: campos requeridos, password >= 6 chars, email/nickname únicos, código activo y no expirado
5. Se hashea la contraseña con bcryptjs (cost 10)
6. Se crea el User con un avatar predefinido asignado al azar
7. Se incrementa `usageCount` del InvitationCode
8. Se hace auto-login con las mismas credenciales (`signIn("credentials", ...)`) y se redirige a `/home`
9. Si el auto-login falla, se redirige a `/login` como fallback

### 5.2 Login con contraseña
1. Usuario accede a `/login`
2. Ingresa email y contraseña
3. Sistema valida que la cuenta esté activa (`isActive=true`)
4. NextAuth valida credenciales contra hash en DB
5. Se genera JWT con id, email, nickname, isAdmin, isActive
6. Se redirige a `/home`

### 5.3 Login con OTP
1. Usuario accede a `/login` y selecciona el tab "EMAIL CODE"
2. Ingresa su email y solicita el código
3. Sistema busca usuario por email. Si no existe o está inactivo, responde éxito igualmente (previene enumeración)
4. Se invalidan OTPs anteriores del usuario (`deleteMany`)
5. Se genera un código OTP de 6 dígitos, se guarda hasheado en DB con expiración de 10 minutos
6. Se envía el código por email (en dev se imprime en consola del server: `🔑 OTP for email: XXXXXX`)
7. UI avanza al paso 2: muestra email confirmado y campo para código de 6 dígitos
8. Usuario ingresa el código y clickea "VERIFY"
9. Sistema valida: código correcto (bcrypt compare), no expirado, no usado
10. Se marca OTP como usado (`usedAt = now`)
11. Se genera JWT manualmente (misma forma que NextAuth credentials) y se setea cookie `authjs.session-token`
12. Se redirige a `/home`

### 5.4 Cerrar sesión
1. Usuario clickea avatar en header → menú dropdown → "Log Out"
2. Se invoca `signOut({ redirectTo: "/login" })` (NextAuth v5 client)
3. Se redirige a `/login`

### 5.5 Gestión de códigos de invitación y cuentas (admin)
Ver flujos completos en [specs/admin.md]. El admin puede generar/desactivar códigos de invitación y desactivar/reactivar cuentas de usuario.

## 6. Pantallas del módulo

### 6.1 Login
- **Ruta:** `/login`
- **Componente:** `src/app/(auth)/login/page.tsx`
- **Acceso:** Anónimo
- **Elementos UI:**
  - Tab o toggle: "Contraseña" | "Código por email"
  - Modo contraseña: campos email/contraseña, botón "Entrar"
  - Modo OTP: campo email → botón "Enviar código" → campo código 6 dígitos → botón "Verificar"
  - Link a registro
- **Endpoints:**
  - `POST /api/auth/[...nextauth]` — login con credenciales
  - `POST /api/auth/otp/request` — solicitar OTP
  - `POST /api/auth/otp/verify` — verificar OTP y crear sesión

### 6.2 Registro
- **Ruta:** `/register?code=ABC123`
- **Componente:** `src/app/(auth)/register/page.tsx`
- **Acceso:** Anónimo
- **Elementos UI:** Card con campos email, contraseña, nickname, código de invitación (pre-llenado si viene por query param), botón "CREATE ACCOUNT"
- **Comportamiento post-registro:** auto-login con `signIn("credentials")` → redirect a `/home`. Fallback a `/login` si falla.
- **Endpoints:**
  - `POST /api/auth/register` — crear usuario (asigna avatar aleatorio de pulpo)

### 6.3 Panel de administración
Ver pantalla completa en [specs/admin.md]. Incluye gestión de códigos de invitación y cuentas de usuario.

## 7. Reglas de negocio
- **BR-01:** El registro requiere un código de invitación activo (`isActive=true`) y no expirado (`expiresAt > now`).
- **BR-02:** Un mismo código de invitación puede ser usado por múltiples personas mientras esté activo.
- **BR-03:** El email y nickname deben ser únicos en el sistema.
- **BR-04:** La contraseña debe tener al menos 6 caracteres.
- **BR-05:** El nickname debe tener al menos 3 caracteres.
- **BR-06:** La sesión es JWT sin expiración explícita (manejada por NextAuth defaults).
- **BR-07:** Al registrarse, se asigna un avatar predefinido al azar de la galería disponible.
- **BR-08:** Un usuario con `isActive=false` no puede iniciar sesión (ni por password ni por OTP).
- **BR-09:** El OTP es un código numérico de 6 dígitos, expira en 10 minutos y es de un solo uso.
- **BR-10:** Solo puede haber un OTP activo por usuario — generar uno nuevo invalida el anterior.
- **BR-11:** El admin no puede desactivar su propia cuenta ni quitarse el rol admin a sí mismo.

## 8. Estados y transiciones

### InvitationCode
```
ACTIVO (isActive=true, expiresAt>now) → admin desactiva → INACTIVO (isActive=false)
ACTIVO (isActive=true, expiresAt>now) → pasa 1 semana → EXPIRADO (expiresAt<now)
```

### User
```
ACTIVO (isActive=true) → admin desactiva → INACTIVO (isActive=false) → admin reactiva → ACTIVO
```

### OtpCode
```
GENERADO (usedAt=null, expiresAt=futuro) → usuario verifica → USADO (usedAt=timestamp)
GENERADO → pasan 10 min → EXPIRADO (expiresAt < now)
GENERADO → se genera nuevo OTP → INVALIDADO (reemplazado)
```

## 9. Datos principales

#### User
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | Identificador único |
| email | String (unique) | Email del usuario |
| passwordHash | String | Hash bcrypt de la contraseña |
| nickname | String (unique) | Nombre público |
| fullName | String? | Nombre completo del usuario (edición en [specs/profile.md]) |
| avatarUrl | String? | URL de avatar (foto subida o avatar predefinido) |
| avatarPreset | String? | ID del avatar predefinido seleccionado (null si subió foto) |
| favoriteTeamId | String? | FK a Team — equipo favorito del usuario |
| isAdmin | Boolean | Si es administrador (default: false) |
| isActive | Boolean | Si la cuenta está activa (default: true) |
| createdAt | DateTime | Fecha de creación |

#### InvitationCode
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | Identificador único |
| code | String (unique) | Código de invitación (se incluye en el link de registro) |
| isActive | Boolean | Si el código acepta nuevos registros (default: true) |
| usageCount | Int | Cantidad de registros realizados con este código (default: 0) |
| expiresAt | DateTime | Fecha de expiración (creación + 7 días) |
| createdAt | DateTime | Fecha de creación |
| deactivatedAt | DateTime? | Fecha de desactivación manual (si aplica) |

#### OtpCode
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | Identificador único |
| userId | String | FK a User |
| codeHash | String | Hash del código OTP de 6 dígitos |
| expiresAt | DateTime | Fecha de expiración (creación + 10 min) |
| usedAt | DateTime? | Fecha de uso (null si no fue usado) |
| createdAt | DateTime | Fecha de creación |

#### Sesión JWT (extendida)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| user.id | String | ID del usuario |
| user.email | String | Email |
| user.name | String | Nickname |
| user.image | String? | Avatar URL (resuelto desde avatarUrl o avatarPreset) |
| user.isAdmin | Boolean | Rol admin |

## 10. Integraciones
- **NextAuth.js v5** — Credentials provider + custom OTP provider, JWT strategy
- **bcryptjs** — Hashing de contraseñas y OTPs (cost factor 10)
- **Email service** — Para envío de OTPs (servicio por definir: Resend, SendGrid, etc.)
- El perfil de usuario se gestiona en [specs/profile.md]
- Referenciado por: [specs/predictions.md], [specs/match-detail.md], [specs/leaderboard.md]

## 11. Errores y validaciones
| Código | Condición | Mensaje |
|--------|----------|---------|
| 400 | Campos faltantes en registro | "Todos los campos son requeridos" |
| 400 | Password < 6 chars | "La contraseña debe tener al menos 6 caracteres" |
| 400 | Código de invitación inactivo o inexistente | "Código de invitación inválido o expirado" |
| 400 | OTP incorrecto | "Código incorrecto" |
| 400 | OTP expirado | "El código expiró, solicitá uno nuevo" |
| 403 | Cuenta desactivada | "Tu cuenta fue desactivada. Contactá al administrador" |
| 403 | Admin intenta desactivarse a sí mismo | "No podés desactivar tu propia cuenta" |
| 409 | Email ya existe | "El email ya está registrado" |
| 409 | Nickname ya existe | "El nickname ya está en uso" |
| 401 | Credenciales incorrectas | "Credenciales inválidas" |
| 429 | Demasiados OTPs solicitados | "Esperá antes de solicitar otro código" |

## 12. Casos especiales
- El seed crea un admin por defecto: `admin@pencachi.com` / `admin123` y un código de invitación inicial activo.
- Si un usuario tiene sesión activa y su cuenta es desactivada, la sesión sigue funcionando hasta que expire o cierre sesión. En el próximo intento de login será bloqueado. (Opcional: middleware que valide `isActive` en cada request).
- El link de invitación tiene la forma `pencachi.com/register?code=ABC123`. El código se pre-llena en el formulario.
- El OTP se envía al email registrado — si el email no existe en el sistema, NO se informa al usuario (previene enumeración de cuentas). Se muestra el mismo mensaje de "código enviado" en ambos casos.

## 13. Decisiones de diseño
- **Código multi-uso:** A diferencia del diseño anterior (un código por persona), ahora un solo código sirve para todo el grupo. Más práctico para compartir por WhatsApp — el admin manda un link y todos se registran. Cuando quiere cerrar el registro, desactiva el código.
- **OTP como alternativa a contraseña:** No es 2FA — es un método alternativo de login para cuando el usuario olvida su contraseña. Más simple que un flujo de "recuperar contraseña" con token + nueva contraseña. El usuario simplemente entra con un código temporal.
- **OTP hasheado:** El código se almacena hasheado en DB por seguridad. Si alguien accede a la DB no puede ver los OTPs.
- **Desactivación de cuentas:** Soft-delete — la cuenta no se borra, se desactiva. Permite reactivar si fue un error. Los datos del usuario (predicciones, puntos) se mantienen y siguen contando en el leaderboard.
- **JWT sin refresh:** Simplicidad sobre seguridad avanzada. La app no maneja datos sensibles más allá de predicciones deportivas.
- **Nickname separado del email:** Permite mostrar nombres amigables en leaderboard y chat sin exponer emails.
- **Rate limit en OTP:** Previene abuso del envío de emails. Se limita a 1 OTP por usuario cada 2 minutos.
