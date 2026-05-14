# Activity

## 1. Objetivo
Mostrar el feed completo de actividad de la comunidad: comentarios en partidos, resultados de partidos y registros de nuevos usuarios. Permite también publicar comentarios generales (sin partido asociado).

## 2. Problema que resuelve
El home muestra un resumen del feed (últimos items). Esta página permite ver toda la actividad sin límite, con filtros por tipo para encontrar lo que interesa. Además, es el único lugar donde se pueden crear comentarios generales que no están ligados a un partido específico.

## 3. Usuarios y roles
| Rol | Capacidades |
|-----|------------|
| Usuario | Ver feed completo de actividad, filtrar por tipo, publicar comentarios generales |

## 4. Alcance
**Dentro del alcance:**
- Feed completo de actividad con paginación cursor-based ("Load more")
- Filtros por tipo (All / Comments / Events)
- Composer para publicar comentarios generales (texto, max 500 chars)

**Fuera del alcance:**
- Feed resumido del home → ver [specs/home.md]
- Chat de partido → ver [specs/match-detail.md]

## 5. Flujos principales

### 5.1 Ver feed de actividad
1. Usuario accede a `/activity`
2. Se cargan los primeros items de actividad (server-side, primeros 15)
3. Puede filtrar por tipo con los pills: All (default), Comments, Events
4. Click en "Load more activity" para cargar más items (cursor-based)

### 5.2 Publicar comentario general
1. Usuario escribe texto en el composer (max 500 chars)
2. Click en "Post" (botón dorado)
3. POST `/api/activity/comments` crea el Comment con `matchId = null`
4. El nuevo comentario aparece al principio del feed
5. El input se limpia tras publicar

### 5.3 Dar like / responder a un evento
1. Los items de tipo `match_result` y `user_joined` muestran SocialRow (likes + replies) igual que los comments
2. Like toggle: POST `/api/activity/items/[activityId]/like` crea/elimina un `ActivityLike`
3. Reply: POST `/api/activity/items/[activityId]/reply` crea un `Comment` con `activityId` (no `parentId`)
4. Las replies a eventos se cargan via GET `/api/activity/items/[activityId]/replies`

### 5.4 Ver quién dio like
1. Usuario toca el número de likes en cualquier item (comment o evento)
2. Se abre un modal con la lista de usuarios que dieron like (avatar + nickname)
3. GET `/api/activity/comments/[commentId]/likes` (para comments) o GET `/api/activity/items/[activityId]/likes` (para eventos)
4. El modal se cierra al tocar fuera o el botón de cerrar

## 6. Pantallas del módulo

### 6.1 Activity Page
- **Ruta:** `/activity`
- **Componente:** `src/app/(main)/activity/page.tsx`
- **Acceso:** Usuario autenticado
- **Elementos UI:**
  - **Título:** "Activity"
  - **Filter pills:** "All" (activo por defecto) | "Comments" | "Events". "Comments" muestra solo items tipo `comment`. "Events" muestra `match_result` y `user_joined`. "All" muestra todos.
  - **Composer:** Card con avatar del usuario, input de texto con placeholder rotativo (ver BR-09), ícono para adjuntar imagen (funcional — sube a file storage), botón "Post" (gold). En mobile: título y pills se apilan verticalmente.
  - **Feed list:** Card con items separados por borde. Mismos item types que el ActivityFeed del home:
    - **Comment:** Avatar, nickname, match reference si tiene matchId (ej: "ARG vs BRA"), timestamp, texto del comentario, imagen adjunta si tiene, SocialRow (likes + replies). Clickeable → `/matches/[matchId]` si tiene matchId.
    - **Match Result:** Ícono `scoreboard` en círculo púrpura, "Match Result", match reference, timestamp, score final + stats de aciertos, SocialRow (likes + replies). Clickeable → `/matches/[matchId]`.
    - **User Joined:** Ícono `person_add` en círculo dorado, nickname del nuevo usuario, timestamp, mensaje de bienvenida, SocialRow (likes + replies).
    - **SocialRow (todos los tipos):** Like button (ícono `favorite` + count clickeable → modal "who liked"), reply button (ícono `chat_bubble` + count). Replies expandibles con composer que soporta texto + imagen adjunta.
  - **Load more:** Botón "Load more activity" al final del feed. Se oculta si no hay más items.
  - **Estado vacío:** "No activity yet"
- **Endpoints:**
  - `GET /api/activity?type=X&cursor=Y&limit=15` — items paginados, filtro opcional por tipo
  - `POST /api/activity/comments` — crear comentario general (body: `{ text: string }`)
  - `POST /api/activity/items/[activityId]/like` — toggle like en cualquier activity (evento)
  - `GET /api/activity/items/[activityId]/replies` — replies a un evento
  - `POST /api/activity/items/[activityId]/reply` — responder a un evento (body: `{ text: string, imageUrl?: string }`)
  - `GET /api/activity/items/[activityId]/likes` — lista de usuarios que dieron like a un evento
  - `GET /api/activity/comments/[commentId]/likes` — lista de usuarios que dieron like a un comment

## 7. Reglas de negocio
- **BR-01:** El feed muestra actividad de toda la comunidad, no solo del usuario actual.
- **BR-02:** Los items se ordenan por fecha descendente (más reciente primero).
- **BR-03:** El composer crea comentarios con `matchId = null` (comentarios generales).
- **BR-04:** Los comentarios tienen un máximo de 500 caracteres y no pueden estar vacíos.
- **BR-05:** El filtro "Events" incluye tanto `match_result` como `user_joined`.
- **BR-06:** Los items de comment son clickeables solo si tienen `matchId`. Los comentarios generales (sin matchId) no son clickeables.
- **BR-07:** El composer permite adjuntar una imagen (JPG, PNG, GIF, WebP, max 5MB) que se sube a file storage.
- **BR-08:** Los eventos (match_result, user_joined) soportan likes y replies, igual que los comments. Los likes en eventos usan el modelo `ActivityLike` (no `CommentLike`). Las replies a eventos son Comments con `activityId` (no `parentId`).
- **BR-09:** Las replies (tanto a comments como a eventos) soportan imagen adjunta, igual que los comments de primer nivel.
- **BR-10:** Al tocar el conteo de likes en cualquier item, se muestra un modal con la lista de usuarios que dieron like (avatar + nickname). Si no hay likes, no se muestra nada.
- **BR-11:** Un usuario solo puede dar like una vez por activity (unique constraint userId+activityId en ActivityLike). Toggle: dar like de nuevo lo quita.

## 8. Estados y transiciones
N/A — Vista de solo lectura con composer. Sin estados complejos.

## 9. Datos principales

> **Comment**: ver definición completa en [specs/match-detail.md, sección 9]. El campo `matchId` es opcional — `null` para comentarios generales desde Activity.

#### ActivityLike
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | Identificador único |
| userId | String | FK a User |
| activityId | String | FK a Activity |
| createdAt | DateTime | Fecha de creación |

> Unique constraint on userId+activityId (un like por usuario por activity).

#### ActivityItem (frontend type, no persisted)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String | ID del recurso origen |
| activityId | String | ID del Activity record (usado para likes/replies en eventos) |
| type | "comment" \| "match_result" \| "user_joined" | Tipo de actividad |
| nickname | String | Nombre del usuario |
| avatarUrl | String? | Avatar del usuario (null para match_result) |
| matchId | String? | Partido asociado (null para user_joined y comentarios generales) |
| homeTeamCode | String? | Código equipo local (para match reference) |
| awayTeamCode | String? | Código equipo visitante (para match reference) |
| detail | String | Descripción/texto de la acción |
| imageUrl | String? | Imagen adjunta (solo comments) |
| likes | Number | Cantidad de likes |
| likedByMe | Boolean | Si el usuario actual dio like |
| replies | Number | Cantidad de replies |
| createdAt | String (ISO) | Timestamp |

#### ActivityFeedResponse (API response)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| items | ActivityItem[] | Items de la página actual |
| nextCursor | String? | Cursor para la siguiente página (null si no hay más) |

## 10. Integraciones
- Depende de: [specs/auth.md] (User), [specs/matches.md] (Match), [specs/match-detail.md] (Comment)
- El feed agrega datos de comments (con y sin matchId), match results, y user registrations
- No hay polling — carga server-side inicial + "Load more" via client fetch

## 11. Errores y validaciones
| Código | Condición | Mensaje |
|--------|----------|---------|
| 401 | Sin sesión | "Unauthorized" |
| 400 | Comentario vacío | "Comment cannot be empty" |
| 400 | Comentario > 500 chars | "Comment must be 500 characters or less" |

## 12. Casos especiales
- El feed no tiene polling — se carga server-side la primera página. Las siguientes se cargan via client fetch al API.
- Los items de `user_joined` no tienen matchId — no son clickeables a un partido.
- Los comentarios generales (desde composer) no tienen matchId — no son clickeables a un partido.
- Si se aplica un filtro que no tiene resultados, se muestra el estado vacío.
- El composer se resetea tras publicar exitosamente. Si hay error, el texto se mantiene.
- Las replies a eventos (via activityId) son de un solo nivel, igual que las replies a comments.
- El modal "who liked" muestra los últimos 50 likers. Si no hay likes (count = 0), el count no es clickeable.

## 13. Decisiones de diseño
- **Página separada del home:** El home muestra un resumen (últimos ~5 items). La activity page es la versión completa con paginación y filtros.
- **Filtros simples:** Solo 3 opciones (All / Comments / Events). No se justifica un sistema de filtros más complejo para ~50 usuarios.
- **Sin predicciones en el feed:** Las predicciones bulk (40+ de golpe) inundarían el feed. Solo se muestran comentarios, resultados y registros.
- **Cursor-based pagination:** La paginación usa cursor-based pagination para evitar problemas de items duplicados o faltantes cuando se agregan nuevos items mientras el usuario hace scroll. Se activa con botón "Load more activity" en vez de infinite scroll.
- **Composer para comentarios generales:** Permite publicar mensajes que no están ligados a ningún partido específico. Esto fomenta la comunidad más allá de los partidos.
- **ActivityLike separado de CommentLike:** Los likes en eventos usan un modelo propio (ActivityLike) en vez de crear Comments "fantasma" para anclar CommentLikes. Esto mantiene la integridad del modelo Comment (siempre es un mensaje real de un usuario).
- **Replies a eventos via activityId:** Las replies a eventos se vinculan al Activity record, no a un Comment padre. Esto evita crear Comments stub sin contenido real.
- **Diseño:** Ver [specs/design-system.md] para tokens visuales.

## 14. Tests

### Unit tests
| Archivo | Cobertura | Tests |
|---------|-----------|-------|
| `src/lib/queries/activity.test.ts` | Feed mapping: activityId, event likes/replies, likedByMe, orphan filtering, pagination cursor | 7 tests |
| `src/components/ui/LikeButton.test.ts` | onCountClick contract (count > 0 vs 0, independence from onToggle) | 3 tests |

### Ejecucion
- `npx vitest run`
