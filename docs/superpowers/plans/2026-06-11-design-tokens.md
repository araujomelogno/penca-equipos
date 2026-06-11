# Plan: Design Tokens Sweep

**Branch:** `chore/design-tokens` (separado de cualquier feature — diff mecánico grande)
**Estado:** Pendiente
**Origen:** 2026-06-11 — el fix de contraste de `--color-text-muted` (#64748b → #8b94a8) solo aplicó donde se usaba la variable; se encontraron 24 usos hardcodeados de #64748b (ya migrados) y ~300 hex hardcodeados más en componentes.

## Problema

`globals.css` define tokens (`--color-text-*`, `--color-accent-*`, `--color-bg-*`) pero la adopción es parcial: los componentes copiaron hex de los diseños `.pen` en styles inline. Cambiar un color de marca hoy implica tocar decenas de archivos, y los fixes de accesibilidad no llegan a los hex sueltos.

Censo al 2026-06-11 (`grep -rEoh '#[0-9a-fA-F]{6,8}' src --include='*.tsx' | sort | uniq -c | sort -rn`):

| Hex | Usos | Token destino |
|---|---|---|
| `#ffe19e` | 32 | `--color-accent-gold` (existe) |
| `#FFFFFF0D` | 32 | `--color-border-subtle` (crear) |
| `#d0c5b2` | 30 | `--color-text-secondary` (existe) |
| `#e9c46a` (+`99`) | 29 | `--color-accent-amber` (crear) |
| `#e5deff` (+`99`) | 22 | `--color-text-primary` (existe) |
| `#1b1736` | 17 | `--color-bg-card` (existe) |
| `#353151` | 14 | `--color-bg-elevated` (crear, verificar nombre vs design-system.md) |
| `#FFFFFF10` / `#FFFFFF08` / `#FFFFFF1A` | 28 | `--color-border-subtle` variantes (crear) |
| `#4ade80` | 8 | `--color-success` (crear) |
| `#393556` | 8 | `--color-bg-highlight` (crear) |
| `#ffb4ab` (+`33`,`1A`) | 16 | `--color-error-soft` (crear) |
| `#c084fc` | 6 | `--color-accent-purple` (crear) |
| `#ef4444` | 4 | `--color-error` (crear) |
| `#8b8399` | varios | `--color-text-wrong` (crear — "muted lavender" para predicciones erradas, decisión de diseño del arena) |
| resto (cola larga) | ~40 | evaluar caso por caso |

## Pasos

### 1. Completar el set de tokens en `globals.css`
- Agregar los tokens "crear" de la tabla. Nombres consistentes con `specs/design-system.md` (actualizar el spec si hace falta — el spec describe comportamiento, no hex; los hex viven solo en globals.css).
- Para los alpha-whites de bordes, definir 2–3 niveles máximo (subtle/default/strong), no uno por valor existente.

### 2. Reemplazo mecánico
- Por archivo: reemplazar hex → `var(--token)`. Los hex con sufijo alpha (`#ffe19e30`) requieren decisión: token con alpha propio o `color-mix()`.
- Verificación visual: screenshot Playwright de cada página (home, matches, standings, predictions, activity, arena, profile, admin/*) antes y después — diff debe ser cero.
- Tests: `npx vitest run` + `npx tsc --noEmit` después de cada lote.

### 3. Guardia anti-regresión
- Regla ESLint (`no-restricted-syntax` con selector sobre literales hex en JSXAttribute `style`, o plugin custom) que falle el lint si aparece `#[0-9a-fA-F]{3,8}` en `.tsx`.
- Excepciones permitidas: `globals.css` (única fuente de hex) y casos justificados con `eslint-disable` comentado.

## Criterios de aceptación
- `grep -rE '#[0-9a-fA-F]{6,8}' src --include='*.tsx'` → 0 resultados (o solo excepciones documentadas).
- Cero cambio visual (screenshots idénticos).
- Lint falla si alguien agrega un hex nuevo en componentes.

## Estimación
~1 sesión: paso 1 corto, paso 2 es el grueso (mecánico + verificación), paso 3 corto.
