# Guía de instalación Pencachi

Mini-guía para poner a andar Pencachi en una empresa nueva (dev local o
producción con Docker). Apunta a los archivos clave del repo en vez de
copiar todo el código, así no queda desactualizada.

## 1. Prerequisitos

- Docker + Docker Compose, o Node 20+ y Postgres 16 si se corre nativo.
- Cuenta en **api-sports.io / API-Football** (plan free anda para
  arrancar) → para sincronizar partidos y resultados.
- Cuenta en **Resend** → para mandar códigos OTP de login por email.
- Servidor con SSH si se va a deployar a producción (el repo viene
  preparado para Droplet de DigitalOcean con nginx proxy).

## 2. Variables de entorno

Copiar `.env.example` a `.env.local` (dev) o setearlas en
`docker-compose.prod.yml` (prod):

| Variable | Para qué | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Conexión Postgres | `postgresql://pencachi:pencachi@localhost:5433/pencachi` |
| `NEXTAUTH_SECRET` | Firma cookies de sesión. **Generar con** `openssl rand -base64 32` | string random |
| `NEXTAUTH_URL` | URL pública del sitio | `https://pencachi.miempresa.com` |
| `AUTH_TRUST_HOST` | Solo en prod detrás de proxy | `true` |
| `API_FOOTBALL_KEY` | API key de api-sports.io | (la que da el Dashboard) |
| `API_FOOTBALL_LEAGUE_ID` | Liga a sincronizar | `1` = World Cup |
| `API_FOOTBALL_SEASON` | Temporada | `2026` |
| `CRON_SECRET` | Auth del endpoint `/api/cron/highlights` | string random |
| `RESEND_API_KEY` | Key de Resend para email OTP | `re_...` |
| `RESEND_FROM` | Remitente verificado en Resend | `Pencachi <login@dominio.com>` |
| `DEFAULT_LOCALE` | Idioma por defecto para visitantes nuevos | `es` o `en` (default `en`) |

Sin `RESEND_API_KEY` el login con OTP no funciona, pero el login con
usuario/contraseña sí.

## 3. Base de datos y carga inicial

```bash
# Si usa Docker:
docker compose up -d db          # levanta solo Postgres en :5433

# Generar el cliente de Prisma y aplicar el schema:
npx prisma generate
npx prisma migrate deploy        # corre las 11 migraciones en prisma/migrations/

# Crear usuario admin + un código de invitación de prueba:
npm run db:seed                  # admin@pencachi.com / admin123  + PENCACHI-001

# Cargar los 48 equipos + 72 partidos de fase de grupos + estadios:
npx tsx scripts/seed-worldcup-2026.ts

# Pronósticos "de expertos" (probabilidades + análisis IA por partido,
# derivado de cuotas NBC/Sky Bet de marzo 2026):
npx tsx scripts/seed-match-probabilities.ts
```

> **Importante:** el primer script borra `Team`, `Match`, `Prediction`,
> `Comment` — correr solo en DB virgen. Después actualizá los equipos TBD
> de playoffs con `npx tsx scripts/update-playoff-teams.ts` cuando se
> definan.

Si en algún momento querés que la sincronización con API-Football
reemplace los IDs falsos por los reales, corré
`npm run db:sync-fixtures`.

## 4. Build + arranque

**Dev local:**

```bash
npm install
npm run dev                      # http://localhost:3030
```

**Producción (Docker):**

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

El `entrypoint.sh` corre `prisma db push` automáticamente al arrancar.

## 5. Crons / servicios

El cron corre en el **host** (crontab del droplet), **no** dentro del
contenedor: el `dcron` que venía en la imagen se quedaba colgado y nunca
disparaba. El host le pega al endpoint público con un script por instancia:

- `deploy/cron-trigger.sh` → se copia a `/opt/<instancia>/cron-trigger.sh`,
  lee `CRON_SECRET` y `NEXTAUTH_URL` del `.env` de esa instancia y hace
  `POST` al path que se le pase.
- Crontab de root (ver `deploy/crontab-additions.txt`), `23:00 UTC` y
  `02:00 UTC` → `/api/cron/highlights` genera los "destacados" del día
  (rachas, lobos solitarios, etc.).

Para una instancia nueva: copiar `cron-trigger.sh` a su carpeta en `/opt`,
darle `+x`, y agregar las dos líneas al crontab del host apuntando a esa
carpeta. El droplet está en UTC, así que los horarios van tal cual.

Para sincronizar resultados desde API-Football **no hay cron**: el admin
lo dispara desde la UI (ver más abajo).

## 6. Qué se puede configurar sin tocar código

| Cosa | Dónde |
|---|---|
| Idioma por defecto | env var `DEFAULT_LOCALE` (`en` o `es`) |
| Textos de la app, títulos, errores | `messages/en.json` y `messages/es.json` (hay que tocar **ambos**) |
| Placeholders del chat / composer ("Tirá tu pronóstico...", "Dale, bancátela...") | `messages/*.json` → `activity.composer.placeholders` y `matches.detail.chat.placeholders` |
| Eventos por defecto de la Prediction Arena (red card, hat-trick, etc.) | `src/lib/prediction-arena-defaults.ts` |
| Probabilidades / análisis de partidos | `scripts/seed-match-probabilities.ts` (rankings de equipos + plantillas de análisis) |
| Liga / temporada a sincronizar | env vars `API_FOOTBALL_LEAGUE_ID` y `API_FOOTBALL_SEASON` |

La app es **bilingüe EN/ES**: cualquier string nuevo va en ambos archivos
de `messages/`.

## 7. Guía rápida para el admin

Login con la cuenta admin (`admin@pencachi.com` por defecto) → menú
**ADMIN** en el header.

### a) Invitaciones (`/admin`)

- Botón **"Generar código"** → crea un `PENCACHI-XXX` aleatorio, válido
  7 días, hasta 20 usos.
- Tabla muestra usos / vencimiento / desactivar.
- El usuario nuevo lo ingresa al registrarse en `/register`.

### b) Usuarios (`/admin`)

- Lista paginada con buscador.
- Toggle de activo / inactivo. Toggle de admin.

### c) Resultados de partidos (`/admin/match-review`)

Dos formas:

1. **Automática (recomendada cuando termina la jornada):** botón
   **"Sync API-Football"** → llama `POST /api/admin/matches/sync`, trae
   todos los fixtures de la liga configurada, actualiza scores y
   estados, y **recalcula los puntos de todos los pronósticos**
   afectados.
2. **Manual:** editar marcador + estado fila por fila. Útil si la API
   tarda en publicar el resultado o hay un error.

Cuando un partido pasa a `FINISHED`, se crea automáticamente una
`Activity` de tipo `MATCH_RESULT` que aparece en el feed.

### d) Highlights / destacados (`/admin`)

Botón **"Generar destacados ahora"** → fuerza la generación del día sin
esperar al cron. La tabla `PublishedHighlight` evita duplicar logros
lifetime (ej. "primer hat-trick") entre días.

### e) Prediction Arena (`/admin/prediction-arena`)

Es el juego semanal de eventos especiales (red card, hat-trick,
comeback, etc.):

1. **Crear semana:** definir deadline (típico martes 23:59 — los
   partidos van miércoles a domingo).
2. **Cargar 6 eventos:** botón **"Cargar defaults"** trae los 6
   estándar de `prediction-arena-defaults.ts`. Se pueden editar emoji,
   título y descripción.
3. **Status flow:** `DRAFT` → publicar pasa a `OPEN` (usuarios
   pronostican) → al pasar el deadline queda `CLOSED` automáticamente
   → al final de la semana resolver cada evento.
4. **Resolver evento:** marcar `HAPPENED` o `NO_HAPPENED`, y si aplica,
   el equipo culpable/protagonista. Al guardar se calculan puntos y se
   elige `Nostradamus` de la semana.

## 8. Operaciones útiles

- **Backup DB:**
  `docker compose exec db pg_dump -U pencachi pencachi > backup.sql`
- **Reset DB en dev:** `npx prisma migrate reset` (corre seed
  automáticamente).
- **Ver logs del cron:** en el host, `/var/log/pencachi-prod-highlights.log`
  y `/var/log/pencachi-trunk-highlights.log` (el crontab del droplet redirige
  ahí la salida de `cron-trigger.sh`).
