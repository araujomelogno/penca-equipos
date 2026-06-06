# Fix: días de partidos en la TZ del usuario

**Fecha:** 2026-06-05
**Branch:** `fix/match-dates-timezone`
**Tipo:** Bug fix

## Problema

Usuarios en Uruguay (UTC−3) reportan que los **días** de los partidos se
muestran mal. Causa raíz: inconsistencia de timezone entre server y cliente.

- El dato (`Match.kickoffTime`, `DateTime`) **es canónico**: un instante
  absoluto en UTC, bien construido por el seed (convierte hora del estadio →
  UTC con `Date.UTC(...)`). No hay bug en los datos.
- El bug está en el **código**, en cómo deriva "¿a qué día calendario
  pertenece este instante?". Esa decisión se toma en dos lugares con dos TZ
  distintas:
  - **Server** (`groupByDate`, `getAllMatchDates`, filtro por fecha): usa
    `date.toISOString().split("T")[0]` → día en **UTC**.
  - **Cliente** (`KickoffTime`): `Intl.DateTimeFormat` sin `timeZone` → día/hora
    en **TZ del navegador**.

Para un partido con kickoff `2026-06-10T00:00:00Z` (medianoche UTC), en Uruguay
es **9 de junio 21:00**, pero el server lo archiva bajo **10 de junio** → el
encabezado/pill dice 10 y la hora dice martes 9. Todo partido cuyo kickoff caiga
de noche en Uruguay (≈ 00:00–03:00 UTC del día siguiente) se va al día
equivocado.

También afecta el **filtro por fecha** (`getFilteredMatches`): arma el rango
`T00:00:00`–`T23:59:59` interpretado en la TZ del server (UTC en Docker), que no
coincide con el día local del usuario.

## Objetivo

Que el día (encabezados, pills, calendario, filtro, "hoy") y la hora del partido
se calculen siempre con la **misma TZ del usuario**, auto-detectada estilo Google
Calendar, resuelta en el server vía cookie (opción B: el cliente detecta su TZ y
la manda en cookie; el server agrupa usando esa TZ, manteniendo el render en el
server).

### Por qué opción B (y no mover todo al cliente)

Google Calendar no tiene el bug porque calcula **día y hora en el mismo lugar con
la misma TZ** (el cliente). Nosotros somos SSR: el agrupado vive en el server
(UTC) y la hora en el cliente. Opción B logra "una sola TZ" sin sacar el render
del server (mejor para SEO/performance, y encaja con que la app ya usa cookies
para el locale).

## Diseño

### 1. Config + helpers de TZ — `src/lib/timezone.ts` (nuevo)

Espejo del patrón de `src/i18n/config.ts`. Sin librerías nuevas, solo `Intl`.

- `TZ_COOKIE = "pencachi_tz"`
- `defaultTimeZone = process.env.DEFAULT_TIMEZONE || "America/Montevideo"`
- `isValidTimeZone(tz: string): boolean` — valida con
  `new Intl.DateTimeFormat(undefined, { timeZone })` en try/catch.
- `getTimeZone(): Promise<string>` (server) — lee `cookies().get(TZ_COOKIE)`,
  valida, cae a `defaultTimeZone`.
- `instantToDateKey(date: Date, tz: string): string` — `"YYYY-MM-DD"` del
  instante **en esa TZ**, vía
  `new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date)`
  (en-CA produce `YYYY-MM-DD`). **Reemplaza todos los
  `toISOString().split("T")[0]`** del flujo de partidos.
- `dayRangeUtc(dateStr: string, tz: string): { start: Date; end: Date }` — los
  instantes UTC que bordean el día calendario `dateStr` en `tz` (para el filtro
  Prisma). Se calcula el offset de `tz` en esa fecha vía `formatToParts` y se
  ajusta el `Date.UTC` correspondiente.
- `todayDateKey(tz: string): string` — `instantToDateKey(new Date(), tz)`.

### 2. Detección en cliente + persistencia

- `src/components/TimeZoneSync.tsx` (`"use client"`), montado una vez en el
  layout principal (`src/app/layout.tsx`): en `useEffect` al montar lee
  `Intl.DateTimeFormat().resolvedOptions().timeZone`; si la cookie no existe o
  difiere, llama al server action `setTimeZone(tz)` y hace `router.refresh()`.
- `src/app/actions/timezone.ts` → `setTimeZone(tz: string)` (`"use server"`):
  valida con `isValidTimeZone`, setea la cookie (`maxAge` 1 año,
  `sameSite: "lax"`, `path: "/"`). Espejo de `setLocale`, **sin** escribir en DB.

### 3. Cableado en `src/lib/queries/matches.ts`

`getMatchesData` resuelve `const tz = await getTimeZone()` una vez y lo baja a:

- `getAllMatchDates(tz)` → usa `instantToDateKey`.
- `getFilteredMatches(filters, tz)` → el filtro de fecha usa `dayRangeUtc`.
- `buildDatePills(allDates, selectedDate, tz)` → "hoy" vía `todayDateKey(tz)`.
- `groupByDate(matches, tz)` → usa `instantToDateKey`.

### 4. Componentes de display

- `MatchList` (server): el label sigue parseando a mediodía
  (`+"T12:00:00"`), seguro una vez que `dateKey` es correcto. Cambio mínimo o
  nulo.
- `KickoffTime` (cliente): ya pinta en TZ del navegador = TZ del usuario → el
  bug desaparece. Se agrega `timeZone` explícito por consistencia.
- `DateSelector` (cliente): corregir el cálculo de "hoy" de la línea ~60
  (`today.toISOString().split("T")[0]`, hoy en UTC) para usar el día local del
  navegador.

## Decisiones tomadas

- **Solo cookie, sin columna en DB / sin migración.** La TZ auto-detectada es una
  propiedad del **dispositivo/ubicación**, no de la cuenta: guardarla en el user
  sería incorrecto si entra desde otro país. (El locale sí va a DB porque es una
  preferencia real de la persona.)
- **Sin preference de TZ en el perfil** (YAGNI; la auto-detección cubre el 99%,
  como Google).
- **Default del primer render / sin JS / bots:** `process.env.DEFAULT_TIMEZONE`,
  fallback `America/Montevideo`. Posible "parpadeo" del día solo en la primera
  visita de alguien cuya TZ ≠ default; se corrige solo al setear la cookie.

## Tests

TDD (el proyecto requiere unit tests como definition-of-done):

1. **Test que falla primero** reproduciendo el caso Uruguay: un partido con
   kickoff `2026-06-10T00:00:00Z` con `tz="America/Montevideo"` debe agruparse
   bajo `2026-06-09`.
2. Unit tests de los helpers:
   - `instantToDateKey` — caso medianoche UTC, mediodía, y una TZ al este de UTC
     (ej. `Asia/Tokyo`) para verificar el corrimiento en ambos sentidos.
   - `dayRangeUtc` — el rango UTC de un día en `America/Montevideo` arranca a las
     03:00Z.
   - `todayDateKey` — coherente con `instantToDateKey(new Date(), tz)`.
3. (Opcional) E2E Playwright simulando TZ de Uruguay y verificando que el día del
   encabezado coincide con la hora del partido.

## Alcance (auditoría completa del codebase)

Se auditó todo `src/` buscando los patrones del bug (`toISOString().split/slice`,
`Intl`/`toLocale*` sin `timeZone` o forzado a `"UTC"`, parsing `+"T..."`,
`getUTC*`/`getDay`/`getDate`). Resultado clasificado:

### En alcance — bugs de display (se arreglan)

1. **Página de partidos** (`/matches`):
   - `src/lib/queries/matches.ts` — agrupado (`groupByDate`), pills/"hoy"
     (`buildDatePills`, `getAllMatchDates`) y filtro por fecha
     (`getFilteredMatches`) pasan a usar la TZ resuelta.
   - `src/components/matches/DateSelector.tsx` — el "hoy" (línea ~60) deja de
     calcularse en UTC.
   - `src/components/matches/MatchList.tsx` — label OK una vez que `dateKey` es
     correcto (cambio mínimo o nulo).
   - `src/components/ui/KickoffTime.tsx` — agregar `timeZone` explícito.
2. **Prediction Arena — display del deadline**:
   - `src/components/prediction-arena/PredictionArenaView.tsx` (línea ~187): hoy
     fuerza `timeZone: "UTC"` y muestra "…UTC". Se localiza a la TZ del usuario
     (mismo instante) y se quita el sufijo "UTC".

### En alcance — limpieza menor (admin)

Los componentes admin son client y ya renderizan en la TZ del navegador del
admin (no tienen el bug de día corrido). Único arreglo:
- `src/components/admin/PredictionArenaAdmin.tsx` (línea ~172): muestra hora
  local pero la etiqueta como "UTC" (incorrecto). Se quita/corrige el label.

(`MatchReviewTable`, `UsersTable`, `InvitationCodesTable`, `CodeDetail`,
`UserDetail` quedan como están: ya muestran hora local; solo usan `"en-US"`
hardcodeado, no es parte de este bug.)

### Fuera de alcance — UTC intencional (NO tocar)

Cambiar esto sería introducir un bug:
- **`src/lib/queries/prediction-arena.ts` (`getWeekBounds`) y
  `src/app/api/admin/prediction-arena/weeks/route.ts`** — definen los límites de
  la semana del juego (lunes 00:00 → domingo 23:59 **UTC**). Es un **juego
  compartido global**: los límites deben ser idénticos para todos los usuarios.
  Localizarlos por usuario rompería la competencia. El instante del deadline está
  bien; solo su display se localiza (ver arriba).
- **`src/lib/highlights.ts` (`nuggetDedupeKey`)** — clave de dedup del ledger
  (backend, no se muestra). UTC consistente es correcto.
- **`src/app/api/admin/invitations/route.ts`** — cálculo de expiración (+7 días),
  no es display de día.
- **Tests de boundaries UTC** (`prediction-arena.test.ts`) — verifican la lógica
  UTC intencional; se mantienen.
```

