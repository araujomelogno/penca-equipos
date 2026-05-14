# General

## 1. Objetivo
Definir las convenciones transversales del proyecto Pencachi que aplican a todos los módulos: stack tecnológico, principios de diseño, estructura del proyecto y reglas de implementación.

## 2. Problema que resuelve
Evitar ambigüedad en decisiones que afectan a todo el proyecto. Establece un marco común para que cualquier módulo se implemente de forma consistente.

## 3. Usuarios y roles
| Rol | Capacidades |
|-----|------------|
| Usuario | Usar la aplicación |
| Admin | Todo lo del usuario + panel de administración |

## 4. Alcance
**Dentro del alcance:**
- Stack tecnológico y versiones
- Principios de diseño e implementación
- Estructura del proyecto
- Convenciones de código

**Fuera del alcance:**
- Funcionalidad específica de cada módulo → ver specs individuales

## 5. Stack tecnológico
| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Next.js | 16.x | Framework fullstack (App Router) |
| React | 19.x | UI |
| TypeScript | 5.x | Tipado |
| Tailwind CSS | 4.x | Estilos |
| Prisma | 7.x | ORM |
| PostgreSQL | — | Base de datos (puerto 5433) |
| NextAuth.js | 5.x | Autenticación |
| bcryptjs | — | Hashing |

## 6. Principios de diseño

### 6.1 Design system
Los tokens de diseño (colores, tipografía, componentes, breakpoints) están definidos en [specs/design-system.md]. Ese archivo es la referencia única para decisiones visuales.

### 6.2 Dark mode
La aplicación es dark-mode only. No hay modo claro.

### 6.3 Navegación global
**Header** reusable con:
- Logo (ícono de pulpo dorado exportado como imagen + wordmark "PENCACHI")
- Nav links (desktop): HOME, STANDINGS, FIXTURE, MATCHES, PREDICTIONS, ACTIVITY, RULES (+ ADMIN si es admin)
- Nav links (mobile): menú hamburguesa con los mismos links. Se cierra al hacer click fuera o al navegar.
- Perfil: avatar/ícono del usuario, despliega menú con "Edit Profile" y "Log Out"

**Footer** reusable con:
- Branding "Pencachi" + copyright
- Links: Terms, Privacy, Support, Contact

## 7. Estructura del proyecto
```
src/
├── app/
│   ├── (auth)/          # Rutas públicas (login, register)
│   ├── (main)/          # Rutas protegidas (dashboard, matches, etc.)
│   ├── api/             # API routes
│   ├── globals.css      # Theme y estilos globales
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Root redirect
├── components/
│   ├── ui/              # Componentes genéricos (Button, Card, Input)
│   └── *.tsx            # Componentes de feature
├── hooks/               # Custom React hooks
├── lib/                 # Utilidades, auth, prisma, scoring
└── types/               # TypeScript definitions
specs/                   # Especificaciones por módulo
prisma/                  # Schema, migrations y seed (admin user + invitation code)
scripts/                 # Scripts utilitarios:
  # seed-worldcup-2026.ts     — Carga 48 equipos y 72 partidos de grupo (datos oficiales FIFA)
  # seed-match-probabilities.ts — Calcula probabilidades y análisis por partido (odds NBC Sports/Sky Bet)
  # generate-avatars.ts        — Genera 12 SVGs de avatares de pulpo en public/avatars/
  # sync-fixtures.ts           — Sync con API-Football (requiere api-football lib, pendiente)
```

## 8. Convenciones de código
- **Idioma del código:** Inglés (variables, funciones, componentes)
- **Idioma de la UI:** Inglés (textos visibles al usuario)
- **Locale:** en-US (fechas, formatos numéricos, todo en inglés)
- **Server vs Client components:** Preferir server components. Usar `"use client"` solo cuando se necesita interactividad (hooks, event handlers, polling).
- **Data fetching:** Server components hacen queries Prisma directas. Client components usan API routes con `usePolling` para datos en tiempo real.
- **Dev server:** Puerto 3030

## 9. Reglas de negocio transversales
- **BR-01:** Todas las rutas bajo `(main)/` requieren sesión autenticada. Sin sesión → redirect a `/login`.
- **BR-02:** Las rutas admin verifican `isAdmin=true` en la sesión. Sin admin → 403.
- **BR-03:** Los usuarios con `isActive=false` no pueden iniciar sesión.

## 10. Integraciones externas
| Servicio | Uso | Autenticación |
|---------|-----|---------------|
| API-Football (api-sports.io) | Datos de partidos, scores, banderas | Header `x-apisports-key` |
| Email service (TBD) | Envío de OTPs | Por definir (actualmente logea a consola en dev) |
| File storage (local) | Fotos de perfil e imágenes de comentarios | Filesystem local (`public/uploads/`) |

## 11. Variables de entorno
```
DATABASE_URL              # Connection string PostgreSQL
NEXTAUTH_SECRET           # Secret para JWT
NEXTAUTH_URL              # URL base de la app
API_FOOTBALL_KEY          # API key de API-Football
API_FOOTBALL_LEAGUE_ID    # ID de la liga (Mundial 2026)
API_FOOTBALL_SEASON       # Temporada
CRON_SECRET               # Secret para el cron externo de sync
```

## 12. Decisiones de diseño
- **Next.js App Router:** Server components por defecto, API routes para operaciones del cliente, server actions para formularios simples.
- **Prisma directo en server components:** Sin capa de servicios intermedia. Para una app de este tamaño, acceder a Prisma directamente desde los server components es más simple y suficiente.
- **Polling sobre WebSockets:** Para ~30-60 usuarios concurrentes, polling cada 15-30s es suficiente y mucho más simple de deployar.
- **Dark mode only:** La app se usa mayormente de noche durante partidos. No justifica mantener dos themes.
- **Design system como referencia:** Los tokens y componentes visuales se documentan en `specs/design-system.md`. El código es la fuente de verdad para los detalles de implementación.
