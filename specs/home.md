# Home

## 1. Objetivo
Proveer una vista unificada del estado actual de la penca: ranking del usuario, actividad reciente, próximos partidos y partidos en vivo. Es la pantalla de inicio tras el login. Su contenido se adapta según la fase del torneo.

## 2. Problema que resuelve
Sin un home, el usuario tendría que navegar entre múltiples pantallas para entender su situación. El home concentra la información más relevante en un solo lugar y cambia su contenido según si el torneo ya empezó o no.

## 3. Usuarios y roles
| Rol | Capacidades |
|-----|------------|
| Usuario | Ver su posición, partidos próximos con predicciones, feed de actividad, stats de participación |

## 4. Alcance
**Dentro del alcance:**
- Home con dos estados según fase del torneo (pre-mundial y torneo activo)
- Componentes: leaderboard podium, stats row, activity feed, upcoming matches, hero banner, participation stats

**Fuera del alcance:**
- Detalle de partido → ver [specs/match-detail.md]
- Formulario de predicción → ver [specs/predictions.md]
- Tabla completa de rankings → ver [specs/leaderboard.md]
- Feed completo de actividad → ver [specs/activity.md]
- Prediction Arena (predicciones semanales) → ver [specs/prediction-arena.md]

## 5. Flujos principales

### 5.1 Carga del home
1. Usuario autenticado accede a `/home`
2. Server evalúa `hasLeaderboard` (hay al menos un partido FINISHED)
3. Si `hasLeaderboard = true` → renderiza estado **Torneo Activo**
4. Si `hasLeaderboard = false` → renderiza estado **Pre-Mundial**

### 5.2 Interacción con cards (torneo activo)
1. Cada card tiene un link al módulo completo ("VIEW FULL RANKING", "View full feed", "View all matches")
2. Los partidos próximos linkan al detalle del partido
3. Los items del feed linkan al partido asociado
4. Si un partido próximo no tiene predicción, se muestra CTA "Predict" → `/matches/[matchId]`

### 5.3 Interacción (pre-mundial)
1. El hero banner tiene CTA "ENTER PREDICTIONS" → `/predictions`
2. El activity feed funciona igual que en torneo activo
3. Si el usuario tiene un equipo favorito y hay un próximo partido de ese equipo, se muestra una card "NEXT MATCH" en la columna derecha (debajo de Top Favorites) con enlace al detalle del partido

## 6. Pantallas del módulo

### 6.1 Home
- **Ruta:** `/home`
- **Componente:** `src/app/(main)/home/page.tsx`
- **Acceso:** Usuario autenticado
- **Contenido condicional:** La misma ruta renderiza componentes distintos según `hasLeaderboard` (ver estados 6.2 y 6.3)
- **Endpoints:** Todos los datos se obtienen server-side con queries Prisma directas (no consume API routes)

### 6.2 Estado: Pre-Mundial
- **Condición:** `hasLeaderboard = false` (ningún partido FINISHED)
- **Layout:** Columna principal con hero + stats + feed
- **Componentes:**
  - **Hero Banner:** Card con "COMPLETE YOUR PREDICTIONS" (texto grande, oculto en mobile) + CTA "ENTER PREDICTIONS" (botón dorado, ancho completo en mobile) → `/predictions` (ver [specs/predictions.md])
  - **Participation Stats:** 3 cards en fila horizontal en mobile, columna vertical en desktop. Cada card ocupa el mismo ancho. (ver 6.4.3)
  - **Activity Feed:** Feed de actividad (ver 6.4.1)
  - **Next Favorite Match Card:** Si el usuario tiene equipo favorito y hay un próximo partido, card con banderas de ambos equipos, nombre del equipo favorito resaltado en dorado, kickoff time, y link al partido. Solo se muestra si hay `favoriteTeamId` y un partido SCHEDULED futuro de ese equipo.
- **No se muestran:** Leaderboard, Stats Row, Upcoming Matches
- **Header:** Sin botón "PREDICT" (deshabilitado)
- **Footer:** Links institucionales

### 6.3 Estado: Torneo Activo
- **Condición:** `hasLeaderboard = true` (hay partidos FINISHED)
- **Layout:** 3 columnas en desktop (columnas laterales estrechas, centro flexible) / stack vertical en mobile
  - Izquierda: Leaderboard Podium + Stats Row
  - Centro: Activity Feed (oculto en mobile)
  - Derecha: Nostradamus Card (ver [specs/prediction-arena.md]) + Upcoming Matches
- **Componentes:**
  - **Leaderboard Podium** (ver 6.4.2)
  - **Stats Row** (ver 6.4.4)
  - **Activity Feed** (ver 6.4.1)
  - **Upcoming Matches** (ver 6.4.5)
- **Footer:** Links institucionales

### 6.4 Componentes

#### 6.4.1 Activity Feed
- **Componente:** `src/components/ActivityFeed.tsx`
- **Usado en:** Pre-Mundial, Torneo Activo, Activity Page
- **Header:** título "ACTIVITY"
- **Item types:** Comment, Match Result, User Joined — ver descripción detallada en [specs/activity.md, sección 6.1]
- **Estado vacío:** "No recent activity yet"
- **Footer (en home):** link "View full feed" → `/activity` (ver [specs/activity.md])

#### 6.4.2 Leaderboard Podium
- **Componente:** `src/components/LeaderboardPodium.tsx`
- **Usado en:** Torneo Activo
- **Header:** título "Leaderboard"
- **Podio (top 3):** 3 pedestales (2do | 1ro | 3ro), cada uno con badge de posición, avatar, nickname, puntos. 1ro más alto/prominente.
- **Ranking contextual:** 5 filas centradas en la posición del usuario (±2). Si el usuario está en top 3, muestra posiciones 4-8. La fila del usuario se destaca (borde + fondo accent).
- **Footer:** link "VIEW FULL RANKING" → `/leaderboard`

#### 6.4.3 Participation Stats
- **Componente:** `src/components/ParticipationStats.tsx`
- **Usado en:** Pre-Mundial
- **Layout:** Fila horizontal en mobile/tablet, columna vertical en desktop. Las 3 cards ocupan el mismo ancho.
- **Cards:**
  - **Completed:** cantidad de predicciones completadas por el usuario
  - **Pending:** cantidad de predicciones pendientes
  - **Matches:** total de partidos del torneo

#### 6.4.4 Stats Row
- **Componente:** `src/components/StatsRow.tsx`
- **Usado en:** Torneo Activo
- **Layout:** 3 mini-cards inline debajo del leaderboard
- **Cards:**
  - **Matches:** cantidad de partidos terminados
  - **Accuracy:** porcentaje de predicciones correctas (ganador correcto o exacto) sobre el total de predicciones puntuadas del usuario
  - **Streak:** racha actual de predicciones exactas consecutivas. Solo cuentan los scores exactos (5 pts). Cualquier resultado que no sea exacto (3 pts o 0 pts) resetea la racha a 0. Se calcula ordenando las predicciones puntuadas por kickoff del partido.
- **Datos:** Se calculan desde las predicciones puntuadas del usuario

#### 6.4.5 Upcoming Matches
- **Componente:** `src/components/UpcomingMatches.tsx`
- **Usado en:** Torneo Activo
- **Header:** título "Upcoming Matches" + tag con fase activa (ej: "Group Stage")
- **Lista de hasta 4 próximos partidos SCHEDULED** usando match cards con gap-6 entre team badges (estados y acciones definidos en [specs/matches.md])
  - Tag con fase activa (ej: "Group Stage"), determinado por el `stage` del primer partido
- **Estado vacío:** "No upcoming matches scheduled"
- **Footer:** link "View all matches" → `/matches`

## 7. Reglas de negocio
- **BR-01:** El estado del home se determina por `hasLeaderboard`: `true` si hay al menos un partido FINISHED con puntos calculados. Esto define si se muestra Pre-Mundial o Torneo Activo.
- **BR-02:** Solo se puede predecir mientras el partido no haya arrancado (status SCHEDULED). Una vez que comienza, el CTA "Predict" desaparece aunque el usuario no haya predicho.

## 8. Estados y transiciones

### Home según fase del torneo
```
PRE-MUNDIAL (hasLeaderboard = false):
  Hero Banner → "COMPLETE YOUR PREDICTIONS" + CTA
  Participation Stats → Completed / Pending / Matches
  Activity Feed → Comentarios, resultados, nuevos usuarios

TORNEO ACTIVO (hasLeaderboard = true):
  Leaderboard Podium → Top 3 + ranking contextual
  Stats Row → Matches / Accuracy / Streak
  Activity Feed → Comentarios, resultados, nuevos usuarios
  Upcoming Matches → Próximos 2 partidos
```

Los estados de las match cards (display por estado, acciones, badges) se definen en [specs/matches.md, sección 8].

## 9. Datos principales

> **User**: ver definición completa en [specs/auth.md, sección 9].

> **Match**: ver definición completa en [specs/matches.md, sección 9].

> **Prediction**: ver definición completa en [specs/predictions.md, sección 9].

> **Team**: ver definición completa en [specs/matches.md, sección 9]. Campos usados aquí: `name`, `code`, `flagUrl`.

#### MatchWithPredictions (server-computed, no persisted)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String | Match ID |
| kickoffTime | Date | Hora de inicio |
| stage | String | Fase del torneo (GROUP, R16, QF, SF, FINAL) |
| homeTeam | Team | Equipo local (name, code, flagUrl) |
| awayTeam | Team | Equipo visitante (name, code, flagUrl) |
| userPrediction | {home, away}? | Predicción del usuario actual (null si no predijo) |
| avgPrediction | {home, away}? | Promedio de todas las predicciones (null si nadie predijo) |
| totalPredictions | Number | Cantidad de predicciones registradas |

> **ActivityItem**: ver definición completa en [specs/activity.md, sección 9].

## 10. Integraciones
- Depende de: [specs/auth.md], [specs/matches.md], [specs/predictions.md], [specs/match-detail.md], [specs/leaderboard.md], [specs/prediction-arena.md]
- Consume datos de todos los módulos server-side (no usa API routes)
- Las banderas de equipos son URLs externas provistas por API-Football (almacenadas en `Team.flagUrl`)

## 11. Errores y validaciones
| Código | Condición | Mensaje |
|--------|----------|---------|
| — | Sin sesión | Redirect a `/login` |

## 12. Casos especiales
- En mobile, el layout pasa de 2 columnas a stack vertical con todas las cards apiladas.
- No hay polling en el home — los datos se cargan una vez en el server. El usuario puede recargar la página para actualizar.
- Si `Team.flagUrl` es null (equipo sin bandera sincronizada), no se muestra imagen — solo el nombre.
- Si no hay partidos SCHEDULED próximos (ej: torneo terminó), la sección de upcoming matches muestra mensaje vacío.
- La Activity Page (`/activity`) no tiene polling — carga server-side con paginación.

## 13. Decisiones de diseño
- **Server-side rendering:** Todo el home se renderiza en el server con queries directas a Prisma. Evita waterfalls de API calls y muestra datos frescos en cada carga.
- **Grid de 3 columnas (torneo activo):** Izquierda (leaderboard + stats), centro (activity feed, oculto en mobile), derecha (upcoming matches). Las columnas laterales son estrechas, el centro ocupa el espacio restante.
- **Una página, dos estados:** En lugar de crear rutas separadas para pre-mundial y torneo activo, se usa la misma ruta `/home` con contenido condicional. El usuario siempre va al mismo lugar.
- **Predicción vs promedio:** Muestra al usuario cómo se compara con el consenso del grupo, agregando un elemento social.
- **CTA "Predict" en lugar de vacío:** Si el usuario no predijo, se aprovecha el espacio para empujar a la acción.
- **2 partidos:** Suficiente para dar contexto inmediato. "Ver todos" siempre disponible.
- **Home Pre-Mundial:** En lugar de un leaderboard vacío, se muestra un CTA de predicciones con stats de participación. Incentiva al usuario a completar predicciones antes del torneo.
- **Activity feed sin predicciones:** Las predicciones no se muestran en el feed porque el bulk entry (40+ predicciones de golpe) inundaría la actividad. Se muestran comentarios, resultados de partidos y registros de usuarios.
- **Diseño:** Ver [specs/design-system.md] para tokens visuales.
