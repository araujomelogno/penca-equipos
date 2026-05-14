# Standings & Fixture

## 1. Objetivo
Dos páginas complementarias para seguir la estructura del torneo:
- **Standings** (`/standings`): tablas de posiciones por grupo y partidos de fases eliminatorias por fase.
- **Fixture** (`/fixture`): diagrama de bracket completo del Mundial 2026 (R32 → R16 → QF → SF → Final).

## 2. Problema que resuelve
Los usuarios necesitan ver la estructura del torneo — cómo está cada grupo, quién clasifica, y cómo se arma el cuadro eliminatorio — para contextualizar sus predicciones y seguir la progresión del Mundial.

## 3. Usuarios y roles
| Rol | Capacidades |
|-----|------------|
| Usuario | Ver tablas de posiciones por grupo, ver bracket eliminatorio completo, ver partidos de cada fase |

## 4. Alcance
**Dentro del alcance:**
- Tablas de posiciones por grupo con estadísticas completas (Standings)
- Filtros por fase: Group Stage, Round of 32, Round of 16, Quarter Finals, Semi Finals, Final (Standings)
- Diagrama de bracket completo FIFA 2026 con cruces oficiales (Fixture)

**Fuera del alcance:**
- Listado cronológico de partidos → ver [specs/matches.md]
- Detalle de partido individual → ver [specs/match-detail.md]
- Sincronización con API-Football → ver [specs/admin.md]

## 5. Flujos principales

### 5.1 Ver standings (tablas de posiciones)
1. Usuario accede a `/standings`
2. Ve filtros por fase: Group Stage (default), Round of 32, Round of 16, Quarter Finals, Semi Finals, Final
3. Los filtros de fases eliminatorias solo aparecen cuando hay partidos en esa fase
4. Por defecto muestra todas las tablas de grupo en grid de 3 columnas
5. Al filtrar por fase eliminatoria, muestra los partidos de esa fase

### 5.2 Ver fixture (bracket)
1. Usuario accede a `/fixture`
2. **Desktop:** ve el bracket espejado completo — mitad izquierda avanza de izquierda a derecha (R32→R16→QF→SF), la Final está centrada, y la mitad derecha avanza de derecha a izquierda (R32→R16→QF→SF). Cards y connectors se expanden para ocupar el ancho disponible.
3. **Mobile:** bracket paginado en 4 columnas. Navega entre 3 niveles con flechas < >: Round of 32 (R32+R16 ↔ R16+R32), Quarter Finals (R16+QF ↔ QF+R16), Semi Finals & Final (QF+SF ↔ SF+QF + Final centrada). Dots indican nivel activo. Cards compactas muestran solo bandera (sin texto).
4. Cada match cell muestra equipos (o placeholders como "1° A", "2° B", "3° A/B..") con banderas, scores y status
5. Los conectores SVG visualizan el flujo entre rondas (mirrored en la mitad derecha)

## 6. Pantallas del módulo

### 6.1 Standings (tablas de grupo y knockout)
- **Ruta:** `/standings`
- **Componente:** `src/app/(main)/standings/page.tsx`
- **Acceso:** Usuario autenticado
- **Elementos UI:**
  - **Filtros de fase:** tabs con: Group Stage (default), Round of 32, Round of 16, Quarter Finals, Semi Finals, Final
  - Los filtros de fases eliminatorias aparecen progresivamente: solo se muestran cuando existen partidos con ese stage en la DB (a medida que avanza el torneo)
  - El filtro "Group Stage" muestra todas las tablas de grupo. Para ver una fase eliminatoria hay que seleccionar su filtro específico
  - **Vista de grupo (desktop):** Grid de 2-3 columnas con cards por grupo. Cada card tiene header "GROUP X" con ícono, y tabla con columnas: TEAM (bandera + nombre), MP, W, D, L, GD, PTS. Top 2 destacados como clasificados
  - **Vista de grupo (mobile):** Tabs individuales (All, A, B, C...) para filtrar por grupo. "All" muestra todos los grupos apilados. Al seleccionar un grupo, se muestra solo ese grupo.
  - **Vista de fase eliminatoria:** lista de partidos de esa fase con equipos, scores (si ya se jugaron), fechas
- **Endpoints:** Ninguno — server component con query directa (mismo patrón que Home)

### 6.2 Fixture (bracket completo)
- **Ruta:** `/fixture`
- **Componente:** `src/app/(main)/fixture/page.tsx`
- **Acceso:** Usuario autenticado
- **Elementos UI:**
  - **Desktop (mirror bracket):** Mitad izquierda (R32→R16→QF→SF) avanza hacia la derecha, FINAL centrada, mitad derecha (SF←QF←R16←R32) avanza hacia la izquierda. Cards y connectors se expanden para llenar el ancho del viewport.
  - **Mobile (bracket paginado):** 3 niveles navegables con flechas < > y dots indicadores: (1) Round of 32, (2) Quarter Finals, (3) Semi Finals & Final. Cada nivel muestra 4 columnas enfrentadas. Cards compactas muestran solo bandera sin texto. La altura se adapta al número de matches por nivel.
  - **Match cell:** Muestra dos slots (home/away) con bandera, código de equipo o placeholder formateado ("1° A", "2° B", "3° A/B.."), score si disponible. Indicador "LIVE" si el partido está en curso.
  - **Resolución dinámica:** Los equipos solo se resuelven cuando su grupo tiene al menos un partido FINISHED. Antes de eso, se muestran placeholders. Los slots de 3er lugar muestran "3° X/Y.." porque dependen de cuáles 8 terceros clasifican.
- **Endpoints:** Ninguno — server component con query directa
- **Datos:** `src/lib/queries/bracket.ts` — cruces oficiales FIFA 2026 (matches 73-104)

## 7. Reglas de negocio
- **BR-01:** Las posiciones de grupo se ordenan por: puntos > diferencia de gol > goles a favor (orden de desempate). Los top 2 de cada grupo clasifican a la fase eliminatoria. Los 8 mejores terceros también clasifican.
- **BR-02:** El bracket sigue la estructura oficial FIFA 2026: 16 partidos R32 (matches 73-88), 8 R16 (89-96), 4 QF (97-100), 2 SF (101-102), 1 Final (104). Los cruces de R32 combinan ganadores de grupo, segundos y mejores terceros según el mapping oficial.
- **BR-03:** Los slots de terceros ("3rd C/D/E") no se resuelven hasta que se conocen los 8 terceros clasificados (495 escenarios posibles según FIFA).

## 8. Estados y transiciones
N/A — Fixtures es una vista de solo lectura calculada desde los resultados de partidos. Ver [specs/match-detail.md] para estados de partido.

## 9. Datos principales

> **Team**: ver definición completa en [specs/matches.md, sección 9]. Campos usados aquí: `name`, `code`, `flagUrl`, `group`.

#### GroupStanding (server-computed, no persisted)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| team | Team | Equipo |
| played | Number | Partidos jugados |
| won | Number | Ganados |
| drawn | Number | Empatados |
| lost | Number | Perdidos |
| goalsFor | Number | Goles a favor |
| goalsAgainst | Number | Goles en contra |
| goalDifference | Number | Diferencia de gol |
| points | Number | Puntos (3 por victoria, 1 por empate) |
| qualified | Boolean | Si clasifica (top 2 del grupo) |

## 10. Integraciones
- Los datos de equipos y resultados se sincronizan desde API-Football → ver [specs/admin.md]
- Las banderas de los equipos provienen de `Team.flagUrl`, sincronizado desde API-Football
- Referenciado por: [specs/home.md], [specs/matches.md]

## 11. Errores y validaciones
| Código | Condición | Mensaje |
|--------|----------|---------|
| 401 | Sin sesión | "Unauthorized" |

## 12. Casos especiales
- Las posiciones de grupo se calculan dinámicamente desde los resultados de partidos — no se persisten. Si no hay partidos jugados en un grupo, todos los equipos aparecen con 0 puntos.
- En fases eliminatorias, los partidos aparecen cuando API-Football los crea (usualmente al definirse los clasificados). Antes de eso, el filtro de esa fase no existe.
- Si `Team.flagUrl` es null, no se muestra bandera — solo el nombre/código.
- El bracket muestra placeholders (labels como "1A", "W73") cuando no hay partidos de knockout en la DB. A medida que se seedean los partidos, se muestran los equipos reales con banderas y scores.
- Las posiciones de grupo en el bracket (1A, 2B) se resuelven dinámicamente desde los standings actuales.

## 13. Decisiones de diseño
- **Dos páginas separadas (Standings + Fixture):** Standings muestra datos tabulares (tablas de posición, listas de partidos por fase). Fixture muestra el bracket visual completo. Son complementarias pero sirven a propósitos distintos.
- **Filtros progresivos en Standings:** Las fases eliminatorias aparecen a medida que se juegan. Esto evita mostrar tabs vacíos y refleja la progresión natural del torneo.
- **Grid de 3 columnas:** Permite ver múltiples grupos a la vez sin necesidad de scroll excesivo.
- **Bracket espejado (mirror layout):** El bracket se muestra horizontalmente con ambas mitades convergiendo al centro (Final). En desktop las cards se expanden para llenar el viewport. En mobile se pagina por niveles (3 vistas de 4 columnas).
- **Match cells responsive:** Desktop muestra bandera + código + score. Mobile muestra solo bandera. Sin números de partido — solo "LIVE" si corresponde.
- **Resolución condicional de equipos:** No se muestran equipos hasta que haya resultados reales en el grupo. Evita confusión mostrando un equipo arbitrario como "ganador" del grupo.
