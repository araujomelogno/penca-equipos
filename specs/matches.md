# Matches

## 1. Objetivo
Presentar el listado de partidos del Mundial 2026 con filtros por fase, estado y fecha, mostrando contenido social y el estado de predicción del usuario.

## 2. Problema que resuelve
Los usuarios necesitan navegar los partidos del torneo de forma intuitiva — filtrar por día, por fase o por estado, ver rápidamente quién juega, qué resultados hubo, y cuántos puntos ganaron con sus predicciones. Es el punto de entrada principal a los partidos.

## 3. Usuarios y roles
| Rol | Capacidades |
|-----|------------|
| Usuario | Ver listado de partidos con filtros, ver badges de predicción, ver contenido social en cards |

## 4. Alcance
**Dentro del alcance:**
- Listado de partidos con filtros por estado/fecha/fase
- Match cards con contenido social inline
- Badges de resultado de predicción (EXACT MATCH, PARTIAL MATCH)

**Fuera del alcance:**
- Fixtures (tablas de grupo) → ver [specs/fixtures.md]
- Detalle de partido individual → ver [specs/match-detail.md]
- Sincronización con API-Football (cron y manual) → ver [specs/admin.md]
- Override manual de scores → ver [specs/admin.md]
- Predicciones (formulario) → ver [specs/predictions.md]
- Chat de partido → ver [specs/match-detail.md]

## 5. Flujos principales

### 5.1 Ver listado de partidos
1. Usuario accede a `/matches`
2. Puede filtrar por:
   - **Fase:** All, Group A...L, Round of 16, Quarter Finals, Semi Finals, Final (progresivos)
   - **Estado:** pills All / Scheduled / Ongoing / Finished
   - **Fecha:** date pills con navegación por día (muestra 4-5 días contiguos + ícono calendario para seleccionar fecha arbitraria)
3. Los filtros son combinables (ej: "Group A" + "Finished" muestra los partidos terminados del Grupo A)
4. Partidos agrupados por fecha, ordenados por kickoff
5. Cada card muestra según el estado:
   - **SCHEDULED:** equipos (banderas + nombres), hora, cantidad de predicciones registradas, CTA "PREDICT" (si no predijo) o "EDIT PREDICTION" (si ya predijo)
   - **LIVE/HALFTIME:** equipos, score actual, minuto, predicción del usuario, imagen/comentario preview
   - **FINISHED:** equipos, score final, imagen thumbnail del partido, comentario preview, badge de resultado ("EXACT MATCH" verde / "PARTIAL MATCH" amarillo / sin badge si incorrecto), puntos obtenidos (+5/+3/+0 PTS), o "Not predicted" si no predijo

## 6. Pantallas del módulo

### 6.1 Listado de partidos
- **Ruta:** `/matches`
- **Componente:** `src/app/(main)/matches/page.tsx`
- **Acceso:** Usuario autenticado
- **Elementos UI:**
  - **Título:** "Matches 2026"
  - **Date pills:** navegación por día con 4-5 días contiguos (día de semana abreviado + número), día actual destacado en dorado, ícono calendario para fecha arbitraria
  - **Filtros de fase:** Desktop: tabs con All, Group A...L, Round of 16, QF, SF, Final (progresivos, full labels). Mobile: pills compactas con labels cortos (All, A, B, C... en vez de "Group A", "Group B"). Estilo gold pill activo, mismo diseño que standings.
  - **Filtros de estado:** pills All / Scheduled / Ongoing / Finished
  - Filtros combinables
  - Listado de MatchCards agrupados por fecha (ej: "SATURDAY JUN 15", "SUNDAY JUN 16"), ordenados por kickoff ascendente dentro de cada grupo
  - Las banderas de los equipos provienen de `Team.flagUrl`, sincronizado desde API-Football
  - Cada card muestra contenido social inline: imagen thumbnail del partido y preview del comentario más reciente del partido
  - Cada card según estado:
    - SCHEDULED: equipos (banderas + nombres), hora, cantidad de predicciones, CTA "PREDICT" o "EDIT" (ambos botones del mismo ancho)
    - LIVE/HALFTIME: equipos, score (no real-time, ver nota en [specs/match-detail.md]), indicador "ONGOING", predicción del usuario, contenido social
    - FINISHED: equipos, score final, badge de resultado ("EXACT MATCH" / "PARTIAL MATCH"), puntos (+N PTS), contenido social
  - **Mobile:** SocialStats ("N already predicted", "Avg: X-Y") en fila separada debajo de banderas/scores
- **Endpoints:** Ninguno — server component con query directa (mismo patrón que Home y Fixtures)

## 7. Reglas de negocio
Las reglas de negocio que aplican a los partidos (scoring, predicciones, visibilidad) están definidas en [specs/predictions.md] y [specs/match-detail.md]. Esta spec cubre la visualización del listado — los detalles de display están descritos en la sección 6.

## 8. Estados y transiciones
Los estados de partido y sus transiciones están definidos en [specs/match-detail.md]. Aquí se describe cómo se visualizan en el listado:

### MatchCard display por estado
| Estado | Muestra |
|--------|---------|
| SCHEDULED | Equipos + fecha/hora + countdown + predicted/predict CTA |
| LIVE | Equipos + score + minuto + predicción del usuario |
| HALFTIME | Igual que LIVE con "HT" |
| FINISHED | Equipos + score final + puntos obtenidos por predicción |
| POSTPONED | Equipos + badge "Postponed" |
| CANCELLED | Equipos + badge "Cancelled" |

## 9. Datos principales

#### Team
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | Identificador único |
| apiFootballId | Int (unique) | ID en API-Football |
| name | String | Nombre del equipo |
| code | String | Código de 3 letras (ej: "ARG") |
| flagUrl | String? | URL de la bandera (provista por API-Football) |
| group | String? | Grupo del torneo |

#### Match
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | Identificador único |
| apiFootballId | Int (unique) | ID en API-Football |
| homeTeamId | String | FK a Team |
| awayTeamId | String | FK a Team |
| kickoffTime | DateTime | Hora de inicio |
| stage | String | Etapa: GROUP, R16, QF, SF, FINAL |
| group | String? | Grupo del torneo |
| venue | String? | Estadio |
| homeScore | Int? | Goles local |
| awayScore | Int? | Goles visitante |
| status | MatchStatus | Estado del partido |
| minuteClock | String? | Minuto actual (ej: "45'", "HT") |
| scoreSource | String? | Origen del score: null, "API", "MANUAL", "FAILED" (ver [specs/admin.md, sección 8]) |
| homeWinProb | Float? | Probabilidad de victoria local (0-100), derivada de odds de apuestas |
| drawProb | Float? | Probabilidad de empate (0-100) |
| awayWinProb | Float? | Probabilidad de victoria visitante (0-100) |
| analysis | String? | Texto de análisis contextual del partido |
| lastSyncedAt | DateTime? | Última sincronización |

## 10. Integraciones
- Los datos de partidos y equipos se sincronizan desde API-Football → ver [specs/admin.md] para detalles de la sincronización
- Referenciado por: [specs/predictions.md], [specs/match-detail.md], [specs/fixtures.md], [specs/home.md], [specs/admin.md]

## 11. Errores y validaciones
| Código | Condición | Mensaje |
|--------|----------|---------|
| 401 | Sin sesión | "Unauthorized" |

## 12. Casos especiales
- El script `scripts/sync-fixtures.ts` se ejecuta una sola vez para importar todos los fixtures del torneo a la DB. Es una operación de setup inicial.
- Los partidos POSTPONED y CANCELLED se muestran en el listado pero no permiten predicciones.
- Si `Team.flagUrl` es null, no se muestra bandera — solo el nombre/código.

## 13. Decisiones de diseño
- **Matches es solo lectura para el usuario:** Esta spec cubre visualización. Toda la lógica de sync/override está en [specs/admin.md].
- **apiFootballId como unique:** Permite re-sincronizar sin duplicar partidos. Es el enlace canónico entre la DB local y la fuente externa.
- **Agrupamiento por fecha:** Más intuitivo que una lista plana — el usuario busca "tomorrow's matches", no "match #47".
- **Filtros progresivos:** Las fases eliminatorias aparecen a medida que se juegan. Esto evita mostrar tabs vacíos y refleja la progresión natural del torneo.
- **Puntos visibles en MatchCard FINISHED:** El usuario ve inmediatamente cuántos puntos ganó con cada predicción sin entrar al detalle. Refuerza la gamificación.
- **Contenido social en match cards:** Cada card en el listado muestra un preview del último comentario e imagen del partido, creando engagement y curiosidad para entrar al detalle.
