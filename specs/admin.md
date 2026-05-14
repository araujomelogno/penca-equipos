# Administración

## 1. Objetivo
Proveer herramientas de gestión al administrador: sincronización de scores desde API-Football, corrección manual de resultados con recálculo de puntos, gestión de códigos de invitación y gestión de cuentas de usuario.

## 2. Problema que resuelve
Cuando API-Football falla o tiene datos incorrectos, el admin necesita poder intervenir. También necesita controlar el acceso a la penca — generar un link de invitación para compartir por WhatsApp, revocarlo cuando quiera, y desactivar cuentas que no correspondan.

## 3. Usuarios y roles
| Rol | Capacidades |
|-----|------------|
| Admin | Sync manual de scores, override de resultados, generar/desactivar códigos de invitación, desactivar/reactivar cuentas, promover/quitar admin, gestionar Prediction Arena |
| Usuario | Sin acceso |

## 4. Alcance
**Dentro del alcance:**
- Sincronización manual de scores desde API-Football (trigger desde la UI)
- Override de score de un partido con recálculo de puntos
- Generación y desactivación de códigos de invitación
- Gestión de cuentas de usuario (desactivar/reactivar)

**Fuera del alcance:**
- Configuración de la app
- Gestión de partidos (crear, editar, eliminar manualmente)
- Eliminación permanente de cuentas (solo desactivación)
- Prediction Arena (creación de semanas, resolución de eventos) → ver [specs/prediction-arena.md]

## 5. Flujos principales

### 5.1 Sincronizar scores desde API-Football
1. Admin accede a `/admin/match-review`
2. Clickea botón "Sync Scores" (ghost button)
3. Se invoca POST `/api/admin/matches/sync` (protegido por sesión admin)
4. El endpoint consulta API-Football por partidos LIVE/FINISHED del torneo
5. Actualiza scores y status de cada partido en la DB
6. Marca `scoreSource = "API"` en cada partido sincronizado
7. Recalcula puntos de predicciones para partidos que pasaron a FINISHED
8. Retorna resumen: cantidad de partidos actualizados
9. La tabla se refresca mostrando los scores actualizados con badge "API" verde

### 5.2 Override manual de score
1. Admin en `/admin/match-review` edita los inputs de score (home/away) de uno o más partidos
2. Los inputs editados se marcan visualmente (borde dorado)
3. Clickea "Save Changes" (gold button)
4. PUT `/api/admin/matches/scores` con array de `{ matchId, homeScore, awayScore }`
5. Cada partido se marca como FINISHED con `scoreSource = "MANUAL"`
6. Se recalculan los puntos de todas las predicciones de cada partido afectado
7. La tabla se refresca mostrando badge "MANUAL" dorado

### 5.3 Gestionar códigos de invitación
1. Admin accede a `/admin`
2. Ve la tabla de códigos con estado, usos y fecha de expiración
3. Genera un nuevo código → POST `/api/admin/invitations` (formato: `PENCACHI-XXX`)
4. Copia el link de registro (`/register?code=PENCACHI-XXX`) con botón "Copy link"
5. Desactiva un código activo via toggle switch → PATCH `/api/admin/invitations/[codeId]`
6. Puede buscar códigos con el campo de búsqueda

### 5.4 Gestionar usuarios
1. Admin accede a `/admin`
2. Ve la tabla de usuarios con avatar, nickname, email, fecha de registro
3. Puede buscar usuarios con el campo de búsqueda
4. Activa/desactiva una cuenta via toggle switch → PATCH `/api/admin/users/[userId]` con `{ isActive: bool }`
5. El admin no puede modificar su propia cuenta (su fila muestra "—" en acciones)
6. Los admins se muestran con badge `shield_person` dorado y nickname dorado

## 6. Pantallas del módulo

### 6.1 Admin Panel
- **Ruta:** `/admin`
- **Componente:** `src/app/(main)/admin/page.tsx`
- **Acceso:** Admin solamente (redirect si no es admin)
- **Elementos UI:**
  - **Título:** "Admin Panel"
  - **Review Matches button:** Ghost button con ícono `fact_check` → `/admin/match-review`
  - **Invitation Codes section:**
    - **Section header:** ícono `link` dorado + "Invitation Codes". Campo de búsqueda. Botón "Generate" (gold, ícono `add`).
    - **Tabla (desktop):** columnas CODE, STATUS, USES, EXPIRES, ACTIONS
      - **Fila activa:** código + botón "Copy link" (ícono `content_copy`). Toggle ON.
      - **Fila inactiva:** código gris, badge "Inactive" (rojo), acciones "—".
      - **Fila expirada:** código gris, badge "Expired" (amarillo), acciones "—".
    - **Tabla (mobile):** solo código + "Copy link" + chevron. Click navega a detalle.
    - **Paginación:** prev/next + page numbers + "X-Y of Z" (sin "Showing" en mobile)
  - **Users section:**
    - **Section header:** ícono `group` dorado + "Users". Campo de búsqueda.
    - **Tabla (desktop):** columnas USER (ícono admin + avatar + nickname), EMAIL, JOINED, ACTIONS (toggle o "—" si es self)
    - **Tabla (mobile):** solo avatar + nickname + chevron. Click navega a detalle.
    - **Paginación:** igual que invitaciones.
- **Endpoints:**
  - `GET /api/admin/invitations?search=X&page=1` — listar códigos
  - `POST /api/admin/invitations` — generar un código
  - `GET /api/admin/invitations/[codeId]` — detalle de código
  - `PATCH /api/admin/invitations/[codeId]` — desactivar código
  - `GET /api/admin/users?search=X&page=1` — listar usuarios
  - `GET /api/admin/users/[userId]` — detalle de usuario
  - `PATCH /api/admin/users/[userId]` — toggle active/admin

### 6.3 Code Detail (mobile)
- **Ruta:** `/admin/codes/[codeId]`
- **Acceso:** Admin solamente
- **Elementos UI:**
  - Botón "← Admin" para volver
  - Card con: código destacado, status badge (si inactivo/expirado), botón "Copy invitation link" (ancho completo), info rows (Status, Uses, Expires, Created), toggle para desactivar (si activo)

### 6.4 User Detail (mobile)
- **Ruta:** `/admin/users/[userId]`
- **Acceso:** Admin solamente
- **Elementos UI:**
  - Botón "← Admin" para volver
  - Card con: avatar + nickname + email, admin badge si aplica, info rows (Role, Status, Joined), toggle "Account active" (si no es self)

### 6.2 Match Review
- **Ruta:** `/admin/match-review`
- **Componente:** `src/app/(main)/admin/match-review/page.tsx`
- **Acceso:** Admin solamente
- **Elementos UI:**
  - **Título:** "Match Review"
  - **Buttons:** "Sync Scores" (ghost, ícono `sync`) + "Save Changes" (gold, ícono `save`). En mobile: se apilan debajo del título, íconos ocultos.
  - **Campo de búsqueda** con placeholder "Search matches..."
  - **Tabla (desktop):** columnas DATE, MATCH, HOME score, AWAY score, SOURCE badge, ACTIONS
  - **Tabla (mobile):** headers ocultos. Cada fila como card compacta: equipo vs equipo + fecha, inputs de score + badge source.
  - **Score inputs:** editables inline, colores según estado (normal, editado, error/failed)
  - **Source badges:** "API" (verde), "MANUAL" (dorado), "FAILED" (rojo). Sin badge si no hay score.
  - **Fila FAILED:** fondo rojo tenue para destacar partidos que necesitan atención.
  - **Paginación:** igual que Admin Panel.
- **Endpoints:**
  - `GET /api/admin/matches?search=X&page=1` — listar partidos con scores
  - `POST /api/admin/matches/sync` — sincronizar desde API-Football
  - `PUT /api/admin/matches/scores` — guardar overrides + recalcular puntos

## 7. Reglas de negocio
- **BR-01:** Solo usuarios con `isAdmin=true` pueden acceder a endpoints y pantallas de admin.
- **BR-02:** La generación de código crea exactamente un código por request, formato `PENCACHI-XXX` (3 dígitos random).
- **BR-03:** El override de score siempre marca el partido como FINISHED con `scoreSource = "MANUAL"`.
- **BR-04:** Al hacer override o sync que resulta en FINISHED, se recalculan los puntos de TODAS las predicciones del partido afectado.
- **BR-05:** Recálculo de puntos: exact score = 5 pts, correct winner/draw = 3 pts, wrong = 0 pts.
- **BR-06:** El `CRON_SECRET` se usa exclusivamente para el cron externo automatizado. El sync manual del admin usa sesión.
- **BR-07:** El admin no puede desactivar su propia cuenta ni quitarse el rol admin a sí mismo. Su fila en la tabla muestra "—" en acciones.
- **BR-08:** Desactivar un código no afecta a los usuarios ya registrados con ese código — solo impide nuevos registros.
- **BR-09:** Desactivar una cuenta no borra datos del usuario — sus predicciones y puntos siguen en el leaderboard.
- **BR-10:** Los códigos de invitación expiran automáticamente a los 7 días de su creación.
- **BR-11:** El sync desde API-Football actualiza scores/status de partidos que están en estado LIVE, HALFTIME, o cuyo kickoff ya pasó. No toca partidos SCHEDULED futuros.
- **BR-12:** Si el sync falla para un partido individual, los demás continúan procesándose. El partido fallido se marca con `scoreSource = "FAILED"`.

## 8. Estados y transiciones

> Ver transiciones de InvitationCode en [specs/auth.md, sección 8].

> Ver transiciones de User (activo/inactivo) en [specs/auth.md, sección 8].

> Ver transiciones de Match en [specs/match-detail.md, sección 8].

### Score Source
| Valor | Significado | Badge |
|-------|------------|-------|
| null | Sin score aún (SCHEDULED) | — |
| API | Score obtenido de API-Football | Verde |
| MANUAL | Score ingresado manualmente por admin | Dorado |
| FAILED | Sync intentado pero falló | Rojo |

## 9. Datos principales

> **InvitationCode**: ver definición completa en [specs/auth.md, sección 9].

> **User**: ver definición completa en [specs/auth.md, sección 9].

> **Match**: ver definición completa en [specs/matches.md, sección 9]. Campo adicional usado aquí: `scoreSource` (String?, valores: null, "API", "MANUAL", "FAILED").

> **Prediction**: ver definición completa en [specs/predictions.md, sección 9].

#### Score recalculation logic
```
Para cada prediction del match:
  if prediction.homeScore == match.homeScore AND prediction.awayScore == match.awayScore:
    points = 5 (exact)
  else if winner(prediction) == winner(match):
    points = 3 (correct winner/draw)
  else:
    points = 0 (wrong)

winner(scores) =
  if homeScore > awayScore → "home"
  if homeScore < awayScore → "away"
  if homeScore == awayScore → "draw"
```

## 10. Integraciones
- Depende de: [specs/auth.md] (sesión admin, InvitationCode, User), [specs/matches.md] (Match), [specs/predictions.md] (recálculo de puntos)
- El sync usa API-Football v3 (`v3.football.api-sports.io/fixtures`) con header `x-apisports-key`
- El módulo `src/lib/api-football.ts` encapsula todas las llamadas a la API externa

## 11. Errores y validaciones
| Código | Condición | Mensaje |
|--------|----------|---------|
| 403 | Usuario no es admin | "Forbidden" |
| 401 | Sin sesión | "Unauthorized" |
| 403 | Admin intenta modificarse a sí mismo | "Cannot modify your own account" |
| 400 | Campos faltantes en override | "matchId, homeScore and awayScore required" |
| 404 | Partido no encontrado en override | "Match not found" |
| 404 | Código no encontrado | "Invitation code not found" |
| 404 | Usuario no encontrado | "User not found" |
| 500 | API-Football no configurada | "API-Football credentials not configured" |

## 12. Casos especiales
- El admin default se crea en el seed: `admin@pencachi.com` / `admin123`. Otros admins se crean promoviendo usuarios desde el panel.
- Si el sync falla para un partido individual, los demás continúan procesándose.
- Los códigos de invitación expiran automáticamente a los 7 días de su creación.
- El sync manual del admin usa un endpoint propio que valida sesión admin, no el `CRON_SECRET`.
- En la tabla de invitaciones, el link debe ser copiable con un click (botón copy-to-clipboard).
- Si `API_FOOTBALL_KEY` no está configurada, el sync retorna error 500 con mensaje descriptivo.
- El "Save Changes" en Match Review es un bulk save — puede guardar múltiples overrides de golpe.

## 13. Decisiones de diseño
- **Dos páginas:** El Admin Panel (códigos + usuarios) y Match Review (scores) son contextos distintos. Separar evita una página sobrecargada. Match Review se accede desde el botón "Review Matches" en Admin Panel.
- **Un código a la vez:** La dinámica es simple — el admin genera un código, lo manda al grupo de WhatsApp, y cuando quiere lo desactiva.
- **Sync manual + override:** El sync trae datos de API-Football. El override es el escape hatch para cuando la API falla o tiene datos incorrectos. Ambos recalculan puntos.
- **Score source tracking:** El badge API/MANUAL/FAILED da visibilidad sobre la procedencia del score. FAILED destaca visualmente (fila roja) para que el admin sepa qué partidos necesitan atención.
- **Soft-delete de cuentas:** Desactivar en lugar de borrar mantiene la integridad del leaderboard y permite revertir errores.
- **No hay RBAC granular:** Solo hay un flag `isAdmin`. Para una penca de amigos no se necesita un sistema de permisos complejo.
- **Toggle switches:** Para activar/desactivar códigos y cuentas. Más intuitivo que botones separados.
- **Inline score editing:** Los scores se editan directamente en la tabla sin modal. Más rápido para revisión masiva de resultados.
- **Diseño:** Ver [specs/design-system.md] para tokens visuales.
