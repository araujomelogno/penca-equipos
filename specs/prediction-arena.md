# Prediction Arena

## 1. Objetivo
Competencia paralela semanal donde el admin propone 6 eventos y los usuarios predicen si ocurren (y con qué equipo) o si no ocurren. Un "Nostradamus de la semana" se corona cada semana.

## 2. Problema que resuelve
La penca principal se centra en scores de partidos. Prediction Arena agrega variedad y engagement con predicciones sobre eventos raros o divertidos (primera roja, hat-trick, remontadas, o incluso cosas inventadas como "en qué país llueve primero"). Es el "premio consuelo" — una competencia separada que da oportunidad a todos.

## 3. Usuarios y roles
| Rol | Capacidades |
|-----|------------|
| Usuario | Ver semana actual, predecir los 6 eventos antes del deadline, ver resultados de semanas pasadas, ver al Nostradamus de la semana |
| Admin | Crear semana con 6 eventos (manual o carga por defecto), editar eventos/deadline, resolver eventos manualmente |

## 4. Alcance
**Dentro del alcance:**
- Creación semanal de 6 eventos por el admin
- Carga por defecto de eventos estándar cuando hay partidos en la semana
- Predicción de usuarios: "no sucede" o selección de equipo
- Resolución manual por el admin
- Scoring separado (1/2/5 puntos)
- Card "Nostradamus de la semana" en Home
- Página dedicada `/prediction-arena`
- Historial de semanas pasadas

**Fuera del alcance:**
- Resolución automática via API-Football events (futuro enhancement)
- Puntos de Prediction Arena sumando al leaderboard principal
- Más o menos de 6 eventos por semana

## 5. Flujos principales

### 5.1 Admin crea semana
1. Admin accede a `/admin/prediction-arena`
2. Ve si ya existe una semana para la semana calendario actual (lunes-domingo)
3. Si no existe, clickea "Crear semana"
4. El sistema muestra si hay partidos en la semana:
   - **Con partidos:** botón "Cargar eventos por defecto" que precarga los 6 eventos estándar (primera roja, hat-trick, remontada, gol más tardío, primer gol de penal, primer autogol)
   - **Sin partidos:** formulario vacío para 6 eventos custom
5. El admin puede editar cualquier evento (título, descripción, ícono/emoji)
6. El deadline se calcula automáticamente: martes 23:00 UTC (predicciones lun-mar, partidos mié-dom)
7. Guarda la semana con POST `/api/admin/prediction-arena/weeks`

### 5.2 Admin resuelve eventos
1. Admin accede a `/admin/prediction-arena`
2. Ve la semana actual con sus 6 eventos
3. Para cada evento, indica el resultado:
   - "No sucedió" → marca como NO_HAPPENED
   - "Sucedió" + selecciona equipo → marca como HAPPENED con teamId
4. PUT `/api/admin/prediction-arena/events/[eventId]/resolve`
5. Al resolver todos los eventos, el sistema calcula puntos automáticamente
6. Se determina el Nostradamus de la semana

### 5.3 Usuario predice
1. Usuario accede a `/prediction-arena`
2. Ve la semana actual con los 6 eventos y el deadline
3. Para cada evento, elige:
   - "No sucede" (toggle/botón)
   - Un equipo del mundial (selector de equipos)
4. Guarda predicciones con PUT `/api/prediction-arena/predict`
5. Puede modificar hasta el deadline

### 5.4 Usuario ve resultados
1. Después del deadline (o resolución), el usuario ve:
   - Sus predicciones vs los resultados reales
   - Puntos obtenidos por evento
   - Total de la semana
   - Quién es el Nostradamus de la semana
2. Puede navegar al historial de semanas anteriores

## 6. Pantallas del módulo

### 6.1 Prediction Arena (usuario)
- **Ruta:** `/prediction-arena`
- **Componente:** `src/app/(main)/prediction-arena/page.tsx`
- **Acceso:** Usuarios autenticados
- **Elementos UI:**
  - **Header:** "Prediction Arena" + semana actual (ej. "Semana 3 · Jun 16-22")
  - **Deadline countdown:** "Cierra en 2d 5h" o "Cerrado"
  - **Nostradamus card:** Si hay ganador de semana anterior, muestra avatar + nickname + puntos
  - **6 event cards:** Cada una con:
    - Emoji + título del evento
    - Descripción breve
    - Selector: toggle "No sucede" o dropdown de equipos (bandera + código)
    - Post-resolución: resultado real + puntos obtenidos (verde/rojo)
  - **Botón "Guardar predicciones"** (gold, solo si hay cambios y antes del deadline)
  - **Total de puntos** (si semana resuelta)
  - **Historial:** Lista de semanas pasadas (colapsable) con ganador y puntos
- **Endpoints:**
  - `GET /api/prediction-arena/current` — semana actual + eventos + predicciones del usuario
  - `PUT /api/prediction-arena/predict` — guardar predicciones
  - `GET /api/prediction-arena/history` — semanas pasadas

### 6.2 Admin Prediction Arena
- **Ruta:** `/admin/prediction-arena`
- **Componente:** `src/app/(main)/admin/prediction-arena/page.tsx`
- **Acceso:** Admin solamente
- **Elementos UI:**
  - **Header:** "Prediction Arena Admin"
  - **Semana actual:** Si no existe, botón "Crear semana" (gold). Si existe, muestra estado.
  - **Info partidos:** Indicador de si hay partidos en la semana + conteo
  - **Botón "Cargar por defecto":** Solo visible si hay partidos en la semana. Precarga los 6 eventos estándar.
  - **6 event forms:** Cada uno con:
    - Input título (ej. "Primera tarjeta roja")
    - Input descripción (ej. "¿Qué equipo recibe la primera roja de la semana?")
    - Selector de emoji (ej. 🟥)
    - **Resolución:** dropdown "Sin resolver" / "No sucedió" / "Sucedió" + selector de equipo
  - **Deadline:** Date-time picker (UTC)
  - **Botones:** "Guardar" (crear/actualizar semana), "Resolver" (calcular puntos cuando todos resueltos)
- **Endpoints:**
  - `GET /api/admin/prediction-arena/current` — semana actual para admin (con todas las predicciones)
  - `POST /api/admin/prediction-arena/weeks` — crear semana con eventos
  - `PUT /api/admin/prediction-arena/weeks/[weekId]` — editar semana/deadline/eventos
  - `PUT /api/admin/prediction-arena/events/[eventId]/resolve` — resolver evento individual

### 6.3 Card Nostradamus en Home
- **Ubicación:** Home page, en columna derecha (torneo activo) o izquierda (pre-mundial)
- **Componente:** `src/components/NostradamusCard.tsx`
- **Elementos UI:**
  - Título: "Nostradamus de la semana" con emoji 🔮
  - Avatar del ganador (grande)
  - Nickname
  - Puntos obtenidos (ej. "18 pts")
  - Semana (ej. "Semana 3")
  - Link "Ver Prediction Arena →" → `/prediction-arena`
  - Si no hay ganador aún: "Aún no hay Nostradamus"

## 7. Reglas de negocio
- **BR-01:** Las semanas son calendario: lunes 00:00 UTC a domingo 23:59 UTC.
- **BR-02:** Solo puede existir una semana por período calendario.
- **BR-03:** Cada semana tiene exactamente 6 eventos.
- **BR-04:** Un usuario puede predecir una sola vez por evento (upsert).
- **BR-05:** Las predicciones se cierran al llegar el deadline (siempre martes 23:00 UTC — predicciones lun-mar, partidos mié-dom).
- **BR-06:** Scoring por evento:
  - Predijo "no sucede" y no sucedió → 1 punto
  - Predijo "no sucede" y sí sucedió → 0 puntos
  - Predijo equipo X y no sucedió → 0 puntos
  - Predijo equipo X, sucedió con otro equipo → 2 puntos
  - Predijo equipo X, sucedió con equipo X → 5 puntos
- **BR-07:** El Nostradamus es el usuario con mayor puntaje total en la semana. Empate: gana quien guardó sus predicciones primero.
- **BR-08:** Los puntos de Prediction Arena NO suman al leaderboard principal. Es una competencia separada.
- **BR-09:** Solo usuarios activos pueden predecir.
- **BR-10:** El admin no puede predecir (o sí puede, pero no compite por el Nostradamus — a definir).
- **BR-11:** Los eventos por defecto cuando hay partidos son: 🟥 Primera tarjeta roja, ⚽⚽⚽ Hat-trick, 🔄 Remontada, ⏱️ Gol más tardío, 🎯 Primer gol de penal, 🤦 Primer autogol.
- **BR-12:** El admin puede resolver eventos en cualquier orden, pero los puntos se calculan solo cuando los 6 están resueltos.
- **BR-13:** Las predicciones de otros usuarios son invisibles hasta que se cierre el deadline (igual que predicciones de partidos).

## 8. Estados y transiciones

### WeeklyHitsWeek
```
DRAFT → OPEN → CLOSED → RESOLVED
```
| Estado | Significado |
|--------|------------|
| DRAFT | Admin creó la semana pero aún no está visible para usuarios |
| OPEN | Visible para usuarios, pueden predecir (deadline no pasado) |
| CLOSED | Deadline pasado, no se aceptan predicciones, pendiente resolución |
| RESOLVED | Admin resolvió los 6 eventos, puntos calculados, Nostradamus determinado |

### WeeklyHitsEvent
```
PENDING → RESOLVED (HAPPENED | NO_HAPPENED)
```

## 9. Datos principales

### WeeklyHitsWeek
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | PK |
| weekStart | DateTime | Lunes 00:00 UTC (unique) |
| weekEnd | DateTime | Domingo 23:59 UTC |
| weekNumber | Int | Número de semana en el torneo (1, 2, 3...) |
| status | Enum | DRAFT, OPEN, CLOSED, RESOLVED |
| deadline | DateTime | Fecha/hora límite para predecir |
| nostradamusId | String? | FK a User — ganador de la semana |
| createdAt | DateTime | |

### WeeklyHitsEvent
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | PK |
| weekId | String | FK a WeeklyHitsWeek |
| orderIndex | Int | Posición 1-6 |
| emoji | String | Emoji del evento (ej. "🟥") |
| title | String | Título corto (ej. "Primera tarjeta roja") |
| description | String | Descripción (ej. "¿Qué equipo recibe la primera roja?") |
| result | Enum? | HAPPENED, NO_HAPPENED, null (sin resolver) |
| resultTeamId | String? | FK a Team — equipo que cumplió el evento (si HAPPENED) |

### WeeklyHitsPrediction
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | PK |
| userId | String | FK a User |
| eventId | String | FK a WeeklyHitsEvent |
| teamId | String? | FK a Team — null si predice "no sucede" |
| points | Int? | Puntos obtenidos (null hasta resolución) |
| createdAt | DateTime | Usado como tiebreaker |
| updatedAt | DateTime | |
| @@unique([userId, eventId]) | | Una predicción por usuario por evento |

### Enums
```
enum WeekStatus {
  DRAFT
  OPEN
  CLOSED
  RESOLVED
}

enum EventResult {
  HAPPENED
  NO_HAPPENED
}
```

### Eventos por defecto
| # | Emoji | Título | Descripción |
|---|-------|--------|-------------|
| 1 | 🟥 | Primera tarjeta roja | ¿Qué equipo recibe la primera roja de la semana? |
| 2 | ⚽⚽⚽ | Hat-trick | ¿Habrá hat-trick? ¿De qué equipo? |
| 3 | 🔄 | Remontada | ¿Algún equipo remonta un partido? |
| 4 | ⏱️ | Gol más tardío | ¿Qué equipo mete el gol más tarde de la semana? |
| 5 | 🎯 | Primer gol de penal | ¿Qué equipo convierte el primer penal? |
| 6 | 🤦 | Primer autogol | ¿En qué equipo cae el primer autogol? |

## 10. Integraciones
- Depende de: [specs/auth.md] (User, sesión), [specs/matches.md] (Match — para saber si hay partidos en la semana)
- Team entity de [specs/matches.md] para selector de equipos
- Home page [specs/home.md] — NostradamusCard se agrega al layout
- Admin [specs/admin.md] — link a `/admin/prediction-arena` desde Admin Panel

## 11. Errores y validaciones
| Código | Condición | Mensaje |
|--------|----------|---------|
| 403 | No es admin (endpoints admin) | "Forbidden" |
| 401 | Sin sesión | "Unauthorized" |
| 400 | Semana ya existe para ese período | "Ya existe una semana para este período" |
| 400 | No son exactamente 6 eventos | "Se requieren exactamente 6 eventos" |
| 400 | Deadline en el pasado | "El deadline debe ser futuro" |
| 400 | Predicción después del deadline | "El plazo para predecir ya cerró" |
| 400 | Evento ya resuelto al intentar re-resolver | "Este evento ya fue resuelto" |
| 404 | Semana no encontrada | "Semana no encontrada" |
| 404 | Evento no encontrado | "Evento no encontrado" |

## 12. Casos especiales
- Si el admin no crea semana, no hay Prediction Arena esa semana. La card de Nostradamus en Home sigue mostrando al ganador anterior.
- Si ningún usuario predice, no hay Nostradamus (card muestra "Nadie participó esta semana").
- Si hay empate en puntos, gana el que guardó predicciones primero (por `createdAt` más antiguo del primer save).
- El admin puede editar eventos de una semana OPEN (cambiar título, descripción) pero no después de CLOSED.
- Si el admin resuelve parcialmente (ej. 3 de 6) los puntos no se calculan hasta que los 6 estén resueltos.
- Semanas sin partidos: el admin ingresa eventos custom (cualquier cosa creativa).
- El admin puede cambiar el deadline mientras la semana esté en DRAFT u OPEN.

## 13. Decisiones de diseño
- **Competencia separada:** Los puntos de Prediction Arena no interfieren con el leaderboard principal. Esto permite creatividad total en los eventos sin afectar la competencia "seria".
- **Admin manual:** El admin crea y resuelve eventos manualmente. Esto da flexibilidad total — puede crear eventos sobre fútbol, clima, o cualquier cosa divertida. La auto-resolución via API es un enhancement futuro.
- **Carga por defecto:** Cuando hay partidos, el admin tiene un shortcut para cargar los 6 eventos estándar. Reduce trabajo sin eliminar la flexibilidad de editar.
- **Semanas calendario:** Lunes a domingo es universal y predecible. No depende de fixture del torneo.
- **Deadline automático:** Siempre martes 23:00 UTC. Predicciones lun-mar, partidos mié-dom. Simplifica la creación y evita overlaps.
- **Nostradamus card en Home:** Visibilidad alta para motivar la participación. Es compacta y no roba protagonismo al leaderboard principal.

## 14. Observabilidad
- Logger: usa `logger` centralizado de `src/lib/logger.ts` (Pino)
- Operaciones logueadas:
  | Operación | Nivel | Contexto |
  |-----------|-------|----------|
  | Semana creada | info | weekId, weekNumber, deadline |
  | Evento resuelto | info | eventId, result, teamId |
  | Puntos calculados | info | weekId, nostradamusId, totalParticipants |
  | Predicción guardada | info | userId, weekId, eventCount |
  | Error al resolver | error | eventId, err |

## 15. Tests

### Unit tests
| Archivo | Cobertura | Tests |
|---------|-----------|-------|
| `src/lib/prediction-arena-scoring.test.ts` | Cálculo de puntos por evento, determinación de Nostradamus, tiebreaker | TBD |

### Integration tests
| Archivo | Cobertura | Tests |
|---------|-----------|-------|
| TBD | Endpoints de predicción, resolución, creación de semana | TBD |

### Ejecución
- `npx vitest run src/lib/prediction-arena-scoring.test.ts`
