# Design System

## 1. Objetivo
Definir los tokens de diseño y componentes reutilizables de Pencachi. Este archivo es la referencia única para decisiones visuales — las specs de módulos describen **qué** se muestra, este archivo define **cómo** se ve.

## 2. Colores

### Fondos
| Token | Uso |
|-------|-----|
| bg-primary | Fondo principal de la app (oscuro) |
| bg-card | Cards y contenedores |
| bg-card-secondary | Headers de tablas, sub-secciones |
| bg-input | Inputs y campos de texto |
| bg-glass | Overlays con transparencia |

### Texto
| Token | Uso |
|-------|-----|
| text-primary | Texto principal (claro) |
| text-secondary | Texto secundario (beige) |
| text-muted | Texto terciario, placeholders |
| text-accent | Texto destacado (dorado claro) |
| text-accent-dark | Texto sobre fondos dorados |

### Acentos
| Token | Uso |
|-------|-----|
| accent-gold | Highlights, tabs activos, badges de posición |
| accent-amber | Gradients, CTAs |
| accent-green | Estados activos, "LIVE", éxito |
| accent-red | Errores, "FAILED" |
| accent-purple | Likes, interacciones |
| accent-silver | 2do lugar, nav inactiva |
| accent-bronze | 3er lugar |

### Bordes
| Token | Uso |
|-------|-----|
| border-subtle | Separadores internos |
| border-light | Bordes de cards y containers |

## 3. Tipografía

| Familia | Variable | Uso |
|---------|----------|-----|
| Plus Jakarta Sans | font-display | Títulos, badges, números destacados |
| Inter | font-body | Texto general, labels, inputs |

### Escala
| Nivel | Uso |
|-------|-----|
| page-title | Títulos de página (grande, italic, bold) |
| section-header | Headers de secciones dentro de cards |
| body | Texto general |
| caption | Labels pequeños, timestamps |
| badge | Tags de estado, counters |

## 4. Componentes reutilizables

### Botones
| Tipo | Uso |
|------|-----|
| btn-primary | CTA principal (gradient dorado, texto oscuro) |
| btn-secondary | Acciones secundarias (borde sutil, texto claro) |
| btn-outline | Acciones terciarias (pill con borde) |
| btn-icon | Botón solo ícono (transparente) |

### Cards
- Fondo: bg-card con borde border-subtle
- Corner radius: redondeado
- Overflow: hidden cuando tiene header

### Tablas (Admin)
- Header: fondo bg-card-secondary
- Filas: separadas por border-subtle
- Paginación: botones prev/next + page numbers + contador "X-Y of Z"

### Status badges
| Estado | Estilo |
|--------|--------|
| Active/Success | Verde sobre fondo verde translúcido |
| Warning/Manual | Dorado sobre fondo dorado translúcido |
| Error/Inactive | Rojo sobre fondo rojo translúcido |
| Expired | Amarillo sobre fondo amarillo translúcido |

### Toggle Switch
- Estado ON: knob dorado, track dorado translúcido
- Estado OFF: knob gris, track oscuro

### Inputs
- Fondo: bg-input
- Borde: border-subtle (normal), accent-amber (editando), accent-red (error)
- Texto centrado para scores

## 5. Breakpoints

| Nombre | Ancho mínimo | Uso |
|--------|-------------|-----|
| mobile | < 640px | Layout vertical, cards compactas |
| tablet | ≥ 640px | Layouts intermedios |
| desktop | ≥ 768px | Grids multi-columna |
| wide | ≥ 1024px | Layouts de 3 columnas |

## 6. Patrones responsive

### Layout de página
- **Mobile:** contenido en columna, padding lateral reducido
- **Desktop:** layouts multi-columna donde corresponda, padding lateral mayor

### Tablas en mobile
- Reducir a columnas esenciales
- Click en fila para ver detalle completo en página separada
- Headers de columna ocultos

### Tabs/Filtros en mobile
- Pills compactas con labels cortos (ej: "A" en vez de "Group A")
- Scroll horizontal si no entran
- Tab "All" como default cuando aplica

### Bracket en mobile
- Cards compactas (solo bandera, sin texto)
- Paginación por niveles en vez de scroll horizontal

## 7. Iconografía
- Librería: Material Symbols Outlined
- Tamaños: se usan según contexto (nav, botones, badges)

## 8. Espaciado
- Gap entre secciones: consistente dentro de page-content
- Gap entre cards en grids: uniforme
- Padding interno de cards: uniforme
