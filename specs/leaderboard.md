# Leaderboard

## 1. Objetivo
Mostrar el ranking de usuarios ordenados por puntos acumulados de predicciones, con estadísticas de rendimiento.

## 2. Problema que resuelve
Provee la competencia central de la penca — los usuarios necesitan ver dónde están parados respecto a los demás. El leaderboard es la motivación principal para participar activamente.

## 3. Usuarios y roles
| Rol | Capacidades |
|-----|------------|
| Usuario | Ver tabla completa, ver su posición destacada |

## 4. Alcance
**Dentro del alcance:**
- Tabla completa de rankings con estadísticas
- Estadísticas: puntos totales, exactos, ganadores correctos

**Fuera del alcance:**
- Rankings por ronda/fase
- Histórico de rankings
- Rankings por grupo de amigos

## 5. Flujos principales

### 5.1 Ver leaderboard completo
1. Usuario accede a `/leaderboard`
2. GET `/api/leaderboard` retorna todos los usuarios rankeados
3. Se muestra tabla con rank, avatar, nickname, exactos, ganadores, puntos
4. La fila del usuario actual se destaca con borde y fondo accent

## 6. Pantallas del módulo

### 6.1 Leaderboard completo
- **Ruta:** `/leaderboard`
- **Componente:** `src/app/(main)/leaderboard/page.tsx` + `src/components/LeaderboardTable.tsx`
- **Acceso:** Usuario autenticado
- **Elementos UI:** Tabla con columnas rank/avatar/nickname/exactos/ganadores/puntos, fila destacada del usuario, top 3 con puntos dorados
- **Endpoints:** Ninguno — server component con query directa (mismo patrón que Home/Fixtures/Matches)

## 7. Reglas de negocio
- **BR-01:** El ranking se ordena por puntos totales descendente.
- **BR-02:** Los puntos totales se calculan sumando `points` de todas las predicciones puntuadas (points != null).
- **BR-03:** Las estadísticas "exactos" y "ganadores" se derivan de contar predicciones con points=5 y points=3 respectivamente.
- **BR-04:** Si no hay puntos calculados aún (ningún partido terminado), el leaderboard muestra estado vacío.

## 8. Estados y transiciones
N/A — El leaderboard es una vista calculada, no tiene estados propios.

## 9. Datos principales

> **User**: ver definición completa en [specs/auth.md, sección 9]. Campos usados aquí: `id`, `nickname`, `avatarUrl`.

> **Prediction**: ver definición completa en [specs/predictions.md, sección 9]. Campos usados aquí: `userId`, `points`.

#### LeaderboardEntry (frontend type, no persisted)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String | User ID |
| rank | Number | Posición en el ranking |
| nickname | String | Nickname del usuario |
| avatarUrl | String? | Avatar |
| totalPoints | Number | Suma de puntos |
| exactScores | Number | Cantidad de predicciones exactas (5 pts) |
| correctWinners | Number | Cantidad de ganadores correctos (3 pts) |
| matchesScored | Number | Cantidad de predicciones puntuadas |

## 10. Integraciones
- Depende de: [specs/auth.md] (User), [specs/predictions.md] (Prediction.points)
- El podio y ranking contextual del home se describen en [specs/home.md] (sección 6.4.2)

## 11. Errores y validaciones
| Código | Condición | Mensaje |
|--------|----------|---------|
| 401 | Sin sesión | "Unauthorized" |

## 12. Casos especiales
- Con muchos usuarios empatados en puntos, el ranking actual no tiene desempate formal — se ordena por el orden interno de la query. Se podría agregar desempate por cantidad de exactos.
- El leaderboard se calcula server-side cada vez que se carga la página — no está cacheado. Para ~60 usuarios esto es aceptable.

## 13. Decisiones de diseño
- **Cálculo on-the-fly:** No hay tabla de rankings materializada. Se calcula desde las predicciones en cada request. Simple y siempre actualizado, viable para el tamaño esperado del grupo (~30-60 usuarios).
- **Ranking contextual ±2:** En lugar de mostrar toda la tabla en el dashboard, se muestran solo las filas cercanas al usuario. Esto da contexto competitivo inmediato ("¿quién está arriba/abajo mío?") sin abrumar.
- **Podio visual:** El top 3 tiene representación visual prominente (pedestales con colores oro/plata/bronce) para dar reconocimiento especial a los líderes.
- **Estadísticas granulares (exactos/ganadores):** Permiten comparar rendimiento cualitativo, no solo cuantitativo. Un usuario con más "exactos" demuestra más conocimiento que uno con solo "ganadores correctos".
