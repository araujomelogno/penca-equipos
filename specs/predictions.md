# Predicciones

## 1. Objetivo
Permitir a los usuarios predecir resultados de partidos antes de que empiecen — tanto de forma individual desde el detalle de un partido como en lote desde una pantalla dedicada — y calcular puntos automaticamente cuando el partido termina.

## 2. Problema que resuelve
- **Individual:** Es la mecanica core de la penca — sin predicciones no hay competencia. El calculo automatico de puntos elimina la necesidad de un administrador revisando resultados manualmente.
- **Bulk:** Predecir partido por partido desde el detalle es tedioso cuando hay muchos partidos por predecir (ej: fase de grupos tiene 48 partidos). La pantalla bulk permite completar predicciones de forma rapida y eficiente, viendo todos los partidos de un grupo de un vistazo.

## 3. Usuarios y roles
| Rol | Capacidades |
|-----|------------|
| Usuario | Crear/editar prediccion antes del kickoff (individual o en lote), ver sus predicciones, ver predicciones de otros (post-kickoff) |
| Admin | Override de scores que dispara recalculo de puntos |

## 4. Alcance
**Dentro del alcance:**
- Crear y editar predicciones individuales (pre-kickoff) desde detalle de partido
- Crear y editar predicciones en lote desde `/predictions` (fase de grupos)
- Guardado atomico en lote (multiples predicciones en un solo request)
- Progreso de predicciones completadas
- Calculo automatico de puntos
- Visualizacion de predicciones propias y ajenas
- Comparativa de prediccion del usuario vs promedio

**Fuera del alcance:**
- Partidos y su sincronizacion → ver [specs/matches.md]
- Leaderboard y rankings → ver [specs/leaderboard.md]
- Partidos de fases eliminatorias en vista bulk (se predicen desde detalle individual)

## 5. Flujos principales

### 5.1 Hacer prediccion individual (desde detalle de partido)
1. Usuario accede a `/matches/[matchId]` de un partido SCHEDULED
2. Ingresa score local y visitante en el PredictionForm
3. PUT `/api/predictions/[matchId]` con `{ homeScore, awayScore }`
4. Se crea o actualiza la prediccion (upsert por userId+matchId)
5. Confirmacion visual en pantalla

### 5.2 Completar predicciones en lote
1. Usuario accede a `/predictions`
2. Ve el progreso general (ej: "12/48" predicciones completadas)
3. Selecciona un tab de grupo (ej: "A-C")
4. Ve un grid de 3 columnas con los grupos del tab seleccionado (ej: Group A, Group B, Group C)
5. Cada grupo muestra sus 6 partidos como cards compactas con inputs de score
6. Usuario ingresa scores en las cards que quiera predecir
7. Al modificar una prediccion, aparece la floating bar inferior con "N unsaved predictions"
8. Clickea "SAVE CHANGES" para guardar todas las predicciones modificadas
9. O clickea "Discard" para descartar los cambios no guardados

### 5.3 Editar prediccion existente (bulk)
1. Si un partido ya tiene prediccion, la card muestra los scores actuales
2. El usuario modifica los scores directamente
3. La card se marca como "dirty" (cambio no guardado)
4. Se guarda con el boton "SAVE CHANGES"

### 5.4 Calculo de puntos (automatico)
1. Cron detecta que un partido paso a FINISHED
2. Se obtienen todas las predicciones del partido
3. Para cada prediccion se ejecuta `calculatePoints(predicted, actual)`
4. Se actualiza el campo `points` de cada prediccion

### 5.5 Ver predicciones de otros
1. Usuario accede a detalle de un partido que ya empezo
2. Se muestran todas las predicciones de otros usuarios con sus scores
3. Si el partido no empezo, solo se ve la prediccion propia

## 6. Pantallas del modulo

### 6.1 Formulario de prediccion (dentro de detalle de partido)
- **Ruta:** `/matches/[matchId]`
- **Componente:** `src/components/PredictionForm.tsx`
- **Acceso:** Usuario autenticado
- **Elementos UI:** Inputs numericos para score local/visitante, boton guardar, estado actual de la prediccion
- **Endpoints:**
  - `GET /api/predictions/[matchId]` — prediccion actual del usuario
  - `PUT /api/predictions/[matchId]` — crear/actualizar prediccion
- Ver [specs/match-detail.md] para contexto completo de la pantalla.

### 6.2 Predictions bulk (/predictions)
- **Ruta:** `/predictions`
- **Componente:** `src/app/(main)/predictions/page.tsx`
- **Acceso:** Usuario autenticado
- **Elementos UI:**
  - **Header:** titulo "Predictions"
  - **Progress card:** barra de progreso + contador "N/M" (predicciones completadas / total de partidos predecibles) en card con borde y fondo accent
  - **Group tabs:** Desktop: pills con rangos de grupos: A-C (default), D-F, G-I, J-L. Mobile: tabs individuales (A, B, C...). Tab activo en dorado. Inicializa mostrando el primer rango completo (ej: A-C con 3 grupos visibles). En mobile, el primer tab individual dentro del rango activo se marca como seleccionado.
  - **Groups grid:** 3 columnas, una por grupo del tab seleccionado. Cada columna es una card con:
    - Header: "GROUP X" (titulo en dorado) + icono clipboard (link a fixtures del grupo)
    - Lista de 6 match cards de prediccion
  - **Match card de prediccion:** card compacta con:
    - Bandera + codigo del equipo local
    - Input de score local (numero)
    - Separador " - "
    - Input de score visitante (numero)
    - Bandera + codigo del equipo visitante
    - Si ya tiene prediccion: muestra scores actuales
    - Si no tiene: inputs vacios
    - Si el partido ya empezo: card deshabilitada (read-only con scores grises)
  - **Floating bar (condicional):** aparece cuando hay al menos 1 prediccion modificada sin guardar
    - Izquierda: "CURRENT SUMMARY" label + "N unsaved new predictions"
    - Derecha: "Discard" (texto link, revierte todos los cambios no guardados al estado original) + "SAVE CHANGES" (boton dorado)
  - **Tabs:** agrupan grupos de a 3 (A-C, D-F, G-I, J-L) para mantener un grid de 3 columnas limpio
- **Endpoints:**
  - Lectura: server component con query directa (mismo patrón que Home/Fixtures/Matches)
  - `PUT /api/predictions/bulk` — guardar multiples predicciones en una transaccion `{ predictions: [{ matchId, homeScore, awayScore }] }`

## 7. Reglas de negocio
- **BR-01:** Solo se puede predecir antes de que el partido comience (`kickoffTime > now`).
- **BR-02:** Un usuario solo puede tener una predicción por partido (unique constraint userId+matchId).
- **BR-03:** Los scores deben ser >= 0 y <= 20.
- **BR-04:** Puntos: exacto = 5 pts, ganador correcto = 3 pts, incorrecto = 0 pts.
- **BR-05:** El "ganador correcto" se determina por `Math.sign(homeScore - awayScore)` — cubre victoria local, empate y victoria visitante.
- **BR-06:** Las predicciones de otros usuarios son invisibles hasta que el partido comienza.
- **BR-07:** Una predicción puede editarse ilimitadamente antes del kickoff.
- **BR-08:** El guardado en lote es atómico — si una predicción falla, ninguna se guarda.
- **BR-09:** El progreso se calcula como: predicciones existentes del usuario / total de partidos SCHEDULED futuros.
- **BR-10:** Los partidos de fases eliminatorias NO aparecen en la vista bulk — solo fase de grupos.

## 8. Estados y transiciones

### Prediction
```
PENDIENTE (points=null) → partido termina → PUNTUADA (points=0|3|5)
```

### Match card de prediccion (bulk)
```
VACIA (sin prediccion):
  Inputs vacios, listos para ingresar scores

CON PREDICCION (guardada):
  Muestra scores actuales, editable

MODIFICADA (dirty):
  Scores cambiados pero no guardados, floating bar visible

DESHABILITADA (partido ya empezo):
  Scores en read-only, card con opacidad reducida
```

## 9. Datos principales

#### Prediction
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | String (cuid) | Identificador unico |
| userId | String | FK a User |
| matchId | String | FK a Match |
| homeScore | Int | Score predicho local |
| awayScore | Int | Score predicho visitante |
| points | Int? | Puntos otorgados (null hasta que el partido termine) |
| createdAt | DateTime | Fecha de creacion |
| updatedAt | DateTime | Ultima modificacion |

#### BulkPredictionRequest
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| predictions | Array | Lista de predicciones a guardar |
| predictions[].matchId | String | ID del partido |
| predictions[].homeScore | Int | Score predicho local (0-20) |
| predictions[].awayScore | Int | Score predicho visitante (0-20) |

#### BulkPredictionResponse
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| saved | Number | Cantidad de predicciones guardadas |
| errors | Array? | Lista de errores por matchId (si hubo) |

#### Constantes de puntuacion
| Constante | Valor | Descripcion |
|-----------|-------|-------------|
| EXACT_SCORE | 5 | Prediccion exacta |
| CORRECT_WINNER | 3 | Acerto el resultado (win/draw/loss) pero no el score |
| WRONG | 0 | No acerto nada |

## 10. Integraciones
- **Scoring logic:** `src/lib/scoring.ts` — funcion `calculatePoints()`
- **Matches:** Depende de [specs/matches.md] para datos de partidos y trigger de calculo
- **Auth:** Depende de [specs/auth.md] para sesion de usuario
- **Home:** Referenciado por [specs/home.md] (CTA "ENTER PREDICTIONS" en Pre-Mundial, card de próximos partidos con predicción vs promedio)
- Referenciado por: [specs/leaderboard.md]
- El endpoint bulk usa el mismo modelo Prediction — hace upsert (create or update) por userId+matchId

## 11. Errores y validaciones
| Codigo | Condicion | Mensaje |
|--------|----------|---------|
| 401 | Sin sesion | "Unauthorized" |
| 400 | Scores fuera de rango (< 0 o > 20) | "Scores must be between 0 and 20" |
| 400 | Partido ya empezo (individual) | "No se puede predecir despues del inicio" |
| 400 | Partido ya empezo (bulk) | "Cannot predict match [matchId]: already started" |
| 400 | Array vacio (bulk) | "No predictions to save" |
| 404 | Partido no existe (individual) | "Partido no encontrado" |
| 404 | Partido no existe (bulk) | "Match [matchId] not found" |

## 12. Casos especiales
- Si el admin hace override de un score (ver [specs/admin.md]), se recalculan los puntos de TODAS las predicciones de ese partido, sobrescribiendo puntos previos.
- Si un partido se pospone despues de que se hicieron predicciones, las predicciones quedan con points=null indefinidamente.
- No hay penalizacion por no predecir — simplemente no se suman puntos.
- Si el usuario navega fuera de la pagina bulk con cambios no guardados, se muestra un confirm dialog ("You have unsaved predictions. Discard changes?").
- Los tabs de grupos solo muestran los que tienen partidos. Si no hay grupo I-L (torneo con menos grupos), el tab no aparece.
- Al guardar en bulk, se re-valida server-side que ningun partido haya empezado entre que el usuario abrio la pagina y clickeo guardar. Si alguno empezo, se guarda el resto y se reporta el error para los que ya empezaron.
- El progreso en la vista bulk se actualiza en tiempo real a medida que el usuario llena inputs (antes de guardar), diferenciando visualmente entre "guardadas" y "pendientes de guardar".

## 13. Decisiones de diseno
- **Upsert en lugar de create/update separados:** Simplifica la API — un solo endpoint PUT maneja tanto crear como actualizar. Aplica tanto al endpoint individual como al bulk.
- **Points nullable:** Permite distinguir "no calculado aun" (null) de "calculado como 0 puntos" (0). Esto es importante para saber si un partido ya fue procesado.
- **Scores visibles post-kickoff:** Evita que los usuarios copien predicciones de otros. Una vez que el partido empieza, ver las predicciones ajenas agrega diversion sin afectar la competencia.
- **Promedio de predicciones en dashboard:** Da contexto social — el usuario ve si su prediccion difiere del consenso del grupo.
- **Bulk sobre individual para fase de grupos:** Para la fase de grupos (48 partidos), ingresar predicciones una a una desde el detalle de partido es ineficiente. La vista bulk permite completar un grupo entero en segundos.
- **Tabs por rango de grupos:** Agrupar de a 3 (A-C, D-F, etc.) mantiene un grid de 3 columnas limpio y evita tener 8+ tabs individuales.
- **Floating bar con unsaved count:** Inspirado en editors como Figma/Notion — el usuario siempre sabe si tiene cambios pendientes y puede guardar o descartar explicitamente.
- **Solo fase de grupos en bulk:** Las eliminatorias se definen progresivamente y tienen pocos partidos por fase, por lo que predecir desde el detalle es suficiente. El bulk es para el volumen inicial de la fase de grupos.
- **Atomic save:** El guardado en lote es todo-o-nada para evitar estados inconsistentes. Si hay un error, el usuario ve cual fue el problema y puede corregir.
- **Diseño:** Ver [specs/design-system.md] para tokens visuales.
