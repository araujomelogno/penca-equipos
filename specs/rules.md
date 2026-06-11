# Rules (`/rules`)

## 1. Propósito

Página de referencia que explica cómo se juega Pencachi: el sistema de puntos de la penca, el cierre de predicciones, los desempates del leaderboard y la Prediction Arena semanal. Es la respuesta canónica a "¿cómo era el tema de los puntajes?".

## 2. Contenido

### 2.1 La Penca (predicciones de partidos)

- Tres niveles de puntaje, presentados con un ejemplo concreto (predicción 2-1):
  - **5 puntos** — resultado exacto (salió 2-1).
  - **3 puntos** — acertaste el ganador o el empate, sin el resultado exacto (salió 3-1).
  - **0 puntos** — ni resultado ni ganador (salió 1-1).
- Los valores de puntos se interpolan desde las constantes del código (`POINTS_EXACT`, `POINTS_CORRECT_WINNER`); el texto nunca hardcodea los números.
- **Cierre:** cada partido se bloquea a la hora de su kickoff. Hasta ese momento la predicción se puede crear o editar.
- **Knockout:** mismo sistema de puntos. Cuenta el resultado final incluyendo alargue; los penales no suman goles (un partido que termina 1-1 y se define por penales puntúa como empate 1-1).

### 2.2 Leaderboard

- El ranking suma los puntos de todos los partidos terminados.
- Desempate: gana quien tenga más resultados exactos.

### 2.3 Prediction Arena

- Juego semanal independiente: **no suma puntos a la penca**; tiene su propio ranking semanal.
- Calendario: las predicciones abren lunes y cierran martes 23:00 UTC; los eventos corresponden a partidos de miércoles a domingo.
- Puntaje por evento:
  - **5 puntos** — el evento pasó y acertaste el equipo.
  - **2 puntos** — el evento pasó pero con otro equipo.
  - **1 punto** — dijiste "no pasa" y no pasó.
  - **0 puntos** — el resto de los casos.
- Los valores se interpolan desde `prediction-arena-scoring.ts`.

### 2.4 Nota de resultados

- Los resultados se sincronizan automáticamente poco después de terminar cada partido.

## 3. Comportamiento

- Página estática (server component), sin interactividad.
- Bilingüe EN/ES vía next-intl; todo string en `messages/en.json` y `messages/es.json` bajo el namespace `rules`.
- Responsive: las cards de puntaje se apilan en mobile.
- La sección de la Arena usa el tratamiento visual propio de la Arena para distinguirla de la penca.

## 4. Reglas de negocio referenciadas

- Puntos penca: `src/lib/scoring.ts` (5/3/0).
- Cierre por kickoff: `src/app/api/predictions/*` (rechaza si `kickoffTime <= now`).
- Desempate: `src/lib/queries/leaderboard.ts` (puntos → exactos).
- Arena: `specs/prediction-arena.md` BR-01/BR-05 y `src/lib/prediction-arena-scoring.ts`.
- Score con alargue: el sync guarda `goals` de API-Football (incluye alargue, no penales).
