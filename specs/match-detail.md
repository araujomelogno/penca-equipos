# Match Detail

## 1. Objetivo
Mostrar la información completa de un partido individual — score, predicciones, análisis de equipos, probabilidades, y chat/discusión en tiempo real.

## 2. Problema que resuelve
Los usuarios necesitan un lugar centralizado para ver toda la información de un partido: resultado actual, su predicción, lo que piensan otros, análisis contextual de los equipos, y discutir con la comunidad. Es la pantalla de mayor engagement durante partidos en vivo.

## 3. Usuarios y roles
| Rol | Capacidades |
|-----|------------|
| Usuario | Ver detalle de partido, ver predicciones de la comunidad (post-kickoff), ver análisis y probabilidades, comentar en chat, adjuntar imágenes a comentarios |

## 4. Alcance
**Dentro del alcance:**
- Hero card con información del partido (equipos, score, status, venue)
- Predicción del usuario (badge y CTA)
- Community Predictions (post-kickoff)
- AI Analysis
- Probability (desde predicciones de la comunidad)
- Chat/Discussion panel

**Fuera del alcance:**
- Formulario de predicción (lógica y validación) → ver [specs/predictions.md]
- Sincronización con API-Football → ver [specs/admin.md]
- Listado de partidos → ver [specs/matches.md]

## 5. Flujos principales

### 5.1 Ver detalle de partido
1. Usuario accede a `/matches/[matchId]`
2. Ve la información completa del partido:
   - Equipos con banderas, score (si hay), stage, venue, fecha/hora, minuteClock
   - Su predicción actual
   - Predicciones de otros usuarios (solo visibles post-kickoff)
   - Análisis de ambos equipos (stats, forma reciente, historial)
3. Puede hacer o editar su predicción (si el partido no empezó)

### 5.2 Comentar en un partido
1. Usuario accede a `/matches/[matchId]`
2. Escribe mensaje en el chat (max 500 chars)
3. Opcionalmente adjunta una imagen al comentario
4. POST `/api/matches/[matchId]/chat` crea el Comment (con imagen si la hay)
5. El chat se actualiza por polling cada 15 segundos

## 6. Pantallas del módulo

### 6.1 Detalle de partido
- **Ruta:** `/matches/[matchId]`
- **Componente:** `src/app/(main)/matches/[matchId]/page.tsx`
- **Acceso:** Usuario autenticado
- **Elementos UI:**
  - **Navigation row (dentro de la columna izquierda):** A la izquierda, breadcrumb "Back to Matches" (o "Back to Predictions" si viene de `/predictions`). A la derecha, botones de paginación al partido anterior/siguiente del mismo grupo con códigos de equipo (ej: "< ARG vs MEX — 3/6 — USA vs BRA >"). Preserva el parámetro `?from=` para mantener contexto de retorno.
  - **Status indicator:** Para partidos en curso (LIVE/HALFTIME), se muestra un indicador "ONGOING" que deja claro que el partido está sucediendo y las predicciones están cerradas. NO es real-time — el score se refresca vía API-Football con baja frecuencia (límite de 100 req/día). Se muestra un timestamp de última actualización (ej: "Last updated: 15 min ago") para que el usuario sepa qué tan fresco es el dato.
  - **Match Card Hero:** fondo con imagen de estadio, overlay gradient oscuro. Muestra:
    - Metadata: torneo, grupo/fase, estadio
    - Equipos con banderas grandes + nombres
    - Score grande centrado (si hay) o "VS" (si no empezó)
    - "Your Prediction: X - Y" (badge dorado) o "NOT YET PREDICTED" (sin CTA, predicciones cerradas si el partido ya arrancó)
    - Links: "PREVIEW" + "STANDINGS" (accesos rápidos)
  - **Layout 2 columnas:**
    - **Columna izquierda:**
      - **Community Predictions:** barras horizontales con los scores más predichos y cantidad de usuarios (ej: "2-0: 40 users"). Solo visible post-kickoff.
      - **Probability:** barras de porcentaje de probabilidad de victoria para cada equipo + empate
      - **AI Analysis:** análisis generado por IA con contexto de ambos equipos (forma reciente, stats, historial)
    - **Columna derecha (panel lateral):**
      - **Chat** (partido en curso) / **Discussion** (no comenzado): header con título + contador de comentarios. El input/composer está arriba (debajo del header, igual que en Activity), seguido por la lista de mensajes ordenados de más nuevo a más viejo (newest first). Input de texto con placeholder rotativo y botón enviar (ícono flecha). Each message can be liked (heart icon toggles, like count clickeable → modal "who liked"). Each root message shows reply count and can be expanded to see replies. Reply input appears when clicking "reply" on a root message, supports text + image attachment. Reply images render inline same as root comment images.
- **Endpoints:**
  - `GET /api/matches/[matchId]` — detalle con predicciones
  - `GET /api/matches/[matchId]/chat?cursor=X&limit=50` — mensajes del chat paginados
  - `POST /api/matches/[matchId]/chat` — enviar mensaje (con imagen opcional)
  - `POST /api/matches/[matchId]/chat/[commentId]/like` — toggle like
  - `POST /api/matches/[matchId]/chat/[commentId]/reply` — reply to a comment (body: `{ text: string, imageUrl?: string }`)
  - `GET /api/matches/[matchId]/chat/[commentId]/likes` — lista de usuarios que dieron like

### 6.2 AI Analysis (dentro de detalle de partido)
- **Componente:** `src/components/match-detail/AIAnalysis.tsx`
- **Elementos UI:**
  - Título "AI Analysis" con ícono `neurology`
  - Texto de análisis contextual del partido (fuerza relativa, estilo de juego, factores clave)
  - Tag inferior: "Based on betting odds from NBC Sports / Sky Bet (March 2026)"
- **Fuente de datos:** Campo `Match.analysis` en BD, pre-generado por `scripts/seed-match-probabilities.ts` usando odds de casas de apuestas. Fallback a texto genérico si el campo es null.

### 6.3 Probability (dentro de detalle de partido)
- **Componente:** `src/components/match-detail/MatchProbability.tsx`
- **Elementos UI:**
  - Título "Probability" con ícono `bar_chart`
  - 3 barras horizontales con porcentaje: equipo local, empate, equipo visitante
  - Barra con gradient dorado sobre fondo oscuro
- **Fuente de datos:** Campos `Match.homeWinProb`, `Match.drawProb`, `Match.awayWinProb` en BD, derivados de odds de casas de apuestas (NBC Sports / Sky Bet) mediante modelo de strength-ratio. Seed script: `scripts/seed-match-probabilities.ts`.

## 7. Reglas de negocio
- **BR-01:** Las predicciones de la comunidad (distribución de scores) son visibles siempre, incluso antes del kickoff. Esto permite ver cuántos predijeron y cuáles son los scores más populares como parte de la experiencia social.
- **BR-02:** El AI Analysis es informativo — no afecta la mecánica de predicción.
- **BR-03:** Las probabilidades se leen de campos pre-calculados en Match (`homeWinProb`, `drawProb`, `awayWinProb`), derivados de odds de casas de apuestas. Suman 100%.
- **BR-04:** El AI Analysis se lee del campo `Match.analysis`, pre-generado en el seed. No se actualiza durante el partido.
- **BR-05:** Los comentarios tienen un máximo de 500 caracteres.
- **BR-06:** Los comentarios no pueden estar vacíos.
- **BR-07:** Las imágenes adjuntas a comentarios: max 5MB, formatos JPG/PNG/GIF/WebP.
- **BR-08:** Un usuario solo puede dar like una vez por comentario (unique constraint userId+commentId). Dar like de nuevo lo quita (toggle).
- **BR-09:** Los replies son de un solo nivel — no se puede responder a un reply (parentId solo puede apuntar a un comentario raíz).
- **BR-10:** Los replies heredan el matchId del comentario padre.
- **BR-11:** Los comentarios desde la Activity page no tienen matchId (son generales). Los comentarios desde Match Detail siempre tienen matchId.
- **BR-12:** Los replies pueden tener imagen adjunta (mismas restricciones que comments: max 5MB, JPG/PNG/GIF/WebP).
- **BR-13:** Al tocar el conteo de likes en un comment o reply, se muestra un modal con la lista de usuarios que dieron like (avatar + nickname). Si count es 0, no es clickeable.

## 8. Estados y transiciones

### Match Status
```
SCHEDULED → LIVE → HALFTIME → LIVE → FINISHED
SCHEDULED → POSTPONED
SCHEDULED → CANCELLED
```

| Estado | Descripción |
|--------|-------------|
| SCHEDULED | Programado, sin empezar |
| LIVE | En juego |
| HALFTIME | En entretiempo |
| FINISHED | Terminado, score final |
| POSTPONED | Pospuesto |
| CANCELLED | Cancelado |

### Chat mode por estado de partido
| Estado | Modo de chat |
|--------|-------------|
| SCHEDULED | "Discussion" (pre-partido, deliberativo) |
| LIVE / HALFTIME | "Chat" (más dinámico, polling 15s) |
| FINISHED | "Discussion" (post-partido) |

## 9. Datos principales

#### Comment
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | Identificador único |
| userId | String | FK a User |
| matchId | String? | FK a Match (null = comentario general desde Activity, ver [specs/activity.md]) |
| text | String | Texto del comentario (max 500) |
| imageUrl | String? | URL de imagen adjunta al comentario (null si no tiene) |
| parentId | String? | FK a Comment (null = comentario raíz, non-null = reply) |
| createdAt | DateTime | Fecha de creación |

#### CommentLike
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | Identificador único |
| userId | String | FK a User |
| commentId | String | FK a Comment |
| createdAt | DateTime | Fecha de creación |

> Unique constraint on userId+commentId (un like por usuario por comentario).

Modelos Match y Team definidos canónicamente en [specs/matches.md].

## 10. Integraciones
- Depende de: [specs/auth.md] (User), [specs/matches.md] (Match, Team)
- Predicción del usuario: formulario en [specs/predictions.md], UI context ("Your Prediction" badge, CTA "PREDICT") en esta pantalla
- El análisis de equipos puede requerir datos adicionales de API-Football (forma reciente, ranking, head-to-head)
- Polling interval: 15s para chat, polling para score/minuteClock en partidos LIVE

## 11. Errores y validaciones
| Código | Condición | Mensaje |
|--------|----------|---------|
| 401 | Sin sesión | "Unauthorized" |
| 404 | Match no encontrado | "Match not found" |
| 400 | Comentario vacío | "El mensaje no puede estar vacío" |
| 400 | Comentario > 500 chars | "Máximo 500 caracteres" |
| 404 | Partido no encontrado (chat) | "Partido no encontrado" |

## 12. Casos especiales
- El análisis de equipos depende de qué datos estén disponibles en API-Football. El alcance exacto de stats se define cuando se explore la API.
- El AI Analysis depende de que haya datos suficientes de los equipos. Si no hay datos, se muestra un mensaje genérico o se oculta la sección.
- Las probabilidades provienen de odds de casas de apuestas (NBC Sports / Sky Bet, marzo 2026), convertidas a porcentajes mediante un modelo de strength-ratio con ventaja de local (8%) y base de empate (~23%).
- Los comentarios con imagen requieren upload previo al envío. El flujo es: usuario selecciona imagen → se sube → se recibe URL → se envía el comentario con la URL.
- Los partidos POSTPONED y CANCELLED muestran el detalle pero no permiten predicciones ni chat activo.
- Polling para partidos en vivo: el detalle usa polling para actualizar score y minuteClock en tiempo real durante partidos LIVE.

## 13. Decisiones de diseño
- **Layout 2 columnas con chat lateral:** El chat ocupa un panel lateral fijo a la derecha, dejando la columna izquierda para información del partido. Esto permite seguir la conversación mientras se ve el score y las predicciones.
- **Chat contextual con dos modos:** "Chat" durante partidos en curso (más dinámico, polling 15s) y "Discussion" para partidos no comenzados/terminados (más deliberativo). Mismo componente, distinto título y tono.
- **Polling sobre WebSockets:** Para un grupo de amigos (~30-60 usuarios), polling cada 15s es suficiente y mucho más simple de implementar y deployar que WebSockets.
- **AI Analysis sobre stats crudas:** En lugar de mostrar tablas de estadísticas (ranking FIFA, forma reciente, etc.), el diseño opta por un análisis narrativo generado por IA. Es más accesible y entretenido para el usuario promedio que tablas de datos.
- **Probabilidades desde odds de apuestas:** Las barras de probabilidad se derivan de odds reales de casas de apuestas, dando una referencia objetiva de fuerza relativa. El seed script convierte odds de campeonato en probabilidades por partido usando un modelo de strength-ratio.
- **Predicción integrada en hero card:** El badge "Your Prediction" y el CTA "PREDICT" están en el hero card para máxima visibilidad. La lógica del formulario vive en [specs/predictions.md], pero el contexto visual está aquí.
- **Chat por partido:** Mantiene las conversaciones contextuales. No hay un chat general — cada discusión está anclada a un partido específico.
- **Cursor pagination en chat:** El chat usa paginación por cursor para cargar mensajes anteriores, evitando problemas de offset con mensajes nuevos.
- **Polling 15s en chat:** El chat hace polling cada 15 segundos para actualizarse. Para un grupo pequeño (~30-60 usuarios), esto es suficiente y más simple que WebSockets.
