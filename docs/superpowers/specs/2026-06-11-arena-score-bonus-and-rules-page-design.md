# Bonus de Arena en el score total + Página de reglas

**Fecha:** 2026-06-11
**Tipo:** Feature (x2) + refactor habilitante
**Estado:** PARCIALMENTE DESCARTADO (2026-06-11)

> ## ⚠️ Idea que no prosperó: bonus de arena
>
> El grupo cambió de idea el mismo día: los aciertos de arena **NO** suman al
> score total. Todo lo referido al bonus (+1 por pleno), al feature flag
> `ARENA_HITS_IN_SCORE` y a la sección condicional de la página de reglas
> queda **descartado** y se conserva solo como registro histórico.
>
> - La arena mantiene su scoring y ranking propios (1/2/5, Nostradamus),
>   totalmente separados del score principal.
> - La **página de reglas sigue vigente** (sin la sección de bonus): tablas de
>   puntos de pronósticos y de arena + definición del ganador.
> - La centralización del cálculo de score (hoy duplicado en `leaderboard.ts`,
>   `home.ts` y `highlights.ts`) ya no es bloqueante; queda anotada como
>   posible mejora de deuda técnica, no como parte de este trabajo.

## Problema / Objetivo

1. **Bonus de arena (opcional por instalación):** cada *pleno* de la Prediction
   Arena (acertar el equipo exacto = 5 pts internos de arena) debe sumar
   **+1 punto al score total** del usuario en el ranking principal. La feature
   se activa o desactiva **por instalación** (hay 2: trunk y prod, cada una con
   su `.env`).
2. **Página de reglas:** `/rules` (hoy "Coming Soon") debe explicar con tablas
   simples cómo se ganan puntos (pronósticos + arena) y cómo se define el
   ganador del torneo.

## Requerimiento transversal (pedido explícito del usuario)

**Existe UN solo score global por persona.** No puede haber dos cálculos
separados que puedan divergir. Hoy el total se calcula en 3 lugares:

- `src/lib/queries/leaderboard.ts` → `getLeaderboardData` (ranking en home y
  página de leaderboard)
- `src/lib/queries/home.ts` → `calculateUserStats` (stats personales en home)
- `src/lib/highlights.ts` → statsMap propio (ranks para nuggets diarios)

El diseño centraliza ese cálculo; los tres consumidores pasan a usar el módulo
compartido.

## Diseño

### 1. Módulo de score único — `src/lib/score.ts` (nuevo)

Función central que computa por usuario:

```
totalPoints = Σ Prediction.points (scored)
            + (ARENA_HITS_IN_SCORE ? arenaExactHits × 1 : 0)
```

- `arenaExactHits` = count de `WeeklyHitsPrediction` con `points = 5` cuyo
  `event.week.status = "RESOLVED"`.
- **Derivado al vuelo, sin cambios de schema ni backfill**: prender/apagar el
  flag tiene efecto retroactivo inmediato.
- Expone lo necesario para los 3 consumidores (totales por usuario, exactos,
  correct winners, matches scored) de modo que `getLeaderboardData`,
  `calculateUserStats` y el ranking de `highlights.ts` deriven todos del mismo
  cálculo.
- **Sin N+1**: los aciertos de arena se obtienen con una sola query agregada
  (`groupBy userId` con filtro `points = 5` y semana resuelta), no por usuario.

### 2. Reglas de ranking (sin cambios, ahora documentadas)

- Orden: `totalPoints` DESC.
- Desempate: más **scores exactos de pronósticos de partidos** (los aciertos
  de arena suman al total pero NO cuentan para el desempate).
- Si persiste el empate: comparten posición.
- `exactScores`, `correctWinners` y `matchesScored` siguen contando **solo
  pronósticos de partidos**; el bonus de arena solo afecta `totalPoints`.

### 3. Feature flag por instalación

- Env var: **`ARENA_HITS_IN_SCORE=true|false`**, default `false`.
- Se lee en `src/lib/feature-flags.ts` (nuevo), espejo del patrón de
  `src/i18n/config.ts` / `src/lib/timezone.ts`: lectura directa de
  `process.env` con fallback, server-only (no `NEXT_PUBLIC_`; todo el cálculo
  y el render condicional de `/rules` son server-side).
- Cada instalación lo setea en su `.env` (trunk: `/opt/pencachi/.env`, prod:
  `/opt/pencachi-prod/.env`).

### 4. Página de reglas — `/rules`

Reemplaza el placeholder en `src/app/(main)/rules/page.tsx`. Server component
sin JS de cliente. El link en el header ya existe. Secciones:

1. **Pronósticos de partidos** (tabla)
   | Resultado | Puntos |
   |---|---|
   | Score exacto | 5 |
   | Resultado correcto (ganador/empate) | 3 |
   | Errado | 0 |
   Nota: en eliminatorias cuentan los 90'/alargue; los penales no alteran el
   marcador a efectos del pronóstico.
2. **Arena** (tabla)
   | Resultado | Puntos de arena |
   |---|---|
   | Acertaste que NO pasaba | 1 |
   | Pasó, pero equipo equivocado | 2 |
   | Pasó con el equipo exacto | 5 |
   Aclara que estos puntos viven en el ranking propio de la arena
   (Nostradamus semanal).
3. **Bonus de arena** — *solo se renderiza si `ARENA_HITS_IN_SCORE` está
   activo en la instalación*: cada pleno de arena (equipo exacto) suma **+1 al
   score total**.
4. **Cómo se define el ganador**: más puntos totales; empate → más scores
   exactos; si persiste → comparten posición.

Detalles:

- Estilo con clases existentes del design system (`page-title`,
  `page-content`, patrones de tabla ya usados); el contenedor define el ancho.
- **Bilingüe**: strings nuevos bajo `rules.*` en `messages/en.json` Y
  `messages/es.json`.
- Los valores de puntos se inyectan en los strings desde las constantes del
  código (`POINTS_EXACT`, `POINTS_CORRECT_WINNER`, constantes de arena) para
  que la página nunca quede desincronizada de la lógica real.

## Fuera de alcance

- El leaderboard y scoring interno de la arena no cambian (1/2/5, Nostradamus
  semanal, top 10).
- No se muestra desglose "pronósticos vs arena" en el leaderboard principal
  (un solo número).
- Sin migraciones de DB.
- Sin UI de administración del flag (es env var por instalación).

## Tests (definition-of-done)

### Unit (Vitest)

- `score.ts`:
  - Flag OFF → total = solo puntos de pronósticos.
  - Flag ON → +1 por cada arena hit de 5 pts; hits de 1 y 2 pts NO suman.
  - Semanas de arena no `RESOLVED` no cuentan.
  - Desempate: arena hits no alteran `exactScores`.
- `feature-flags.ts`: parsing de `true`/`false`/ausente (default off).
- Adaptar tests existentes de leaderboard/home/highlights al módulo
  compartido sin cambiar su semántica con flag off.

### E2E (Playwright)

- `/rules` renderiza título y las tablas de puntos.
- Sección de bonus visible/oculta según el flag.

## Despliegue

- El flag se agrega manualmente a los `.env` de trunk y prod según se decida
  activarlo en cada una (mismo procedimiento que `DEFAULT_LOCALE`).
- Sin pasos de migración.
