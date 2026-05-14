# Design System Strategy: The Arena Editorial

## 1. Overview & Creative North Star
The design system for this prediction platform is defined by the **"The Arena Editorial"** Creative North Star. 

Unlike standard sports apps that rely on flat grids and aggressive borders, this system treats the interface as a high-end digital broadsheet—combining the authority of premium sports journalism with the immersive depth of a modern gaming console. We break the "template" look through **Tonal Layering**, using the depth of the dark navy palette to create a sense of infinite space. Hierarchy is not forced via lines; it is suggested through light, shadow, and sophisticated typographic scale.

The visual language is intentional, atmospheric, and premium, ensuring that the 2026 World Cup experience feels like a marquee event rather than a data entry tool.

---

## 2. Colors: Depth and Luminance
We utilize a Material 3-based palette but apply it with a signature "No-Line" philosophy.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section off content. Boundaries must be defined solely through background color shifts. For example, a `surface_container_highest` card should sit on a `surface` background to create a natural edge.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of tinted glass.
- **Base Layer:** `surface` (#130f2e) - The deep stadium atmosphere.
- **Sectioning:** `surface_container_low` (#1b1736) - Used for broad groupings.
- **Primary Content:** `surface_container_high` (#2a2646) - Standard card backgrounds.
- **Active/Highlighted:** `surface_bright` (#393556) - To call immediate attention to a specific row or card.

### The Glass & Gradient Rule
To achieve a "Signature" feel, use **Glassmorphism** for floating elements (like the navigation bar or top-level headers). Use `secondary_container` at 40% opacity with a 20px backdrop blur to allow team colors and scores to bleed through subtly.

### Signature Textures
Main CTAs (e.g., "Predecir") should not be flat. Apply a subtle linear gradient from `primary` (#ffe19e) to `primary_container` (#e9c46a) at a 135-degree angle to provide visual "soul" and a metallic, trophy-like polish.

---

## 3. Typography: Editorial Authority
The system pairs **Plus Jakarta Sans** (Display/Headlines) with **Inter** (Body/Labels) to balance character with extreme legibility.

- **Display (Plus Jakarta Sans):** Reserved for high-impact moments—total points, current rank, or "World Cup 2026" branding. Large sizes (`display-lg`: 3.5rem) should use tighter tracking (-0.02em) to feel "tight" and professional.
- **Headline & Title (Inter/Plus Jakarta Sans):** Used for group names and section titles. The contrast between `headline-sm` (1.5rem) and `label-sm` (0.68rem) is intentional; extreme scale variance is a hallmark of high-end design.
- **The "Scoreboard" Hierarchy:** Scores must always use `title-lg` or `headline-sm` in `primary` (#ffe19e) to ensure they are the first thing a user sees in the "Arena."

---

## 4. Elevation & Depth
Elevation is conveyed through **Tonal Layering** rather than structural lines.

- **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` section. This creates a soft, natural "recessed" or "lifted" look.
- **Ambient Shadows:** When an element must float (e.g., a modal or a floating action button), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4)`. The shadow must never be pure black; it should feel like an occlusion of the deep navy background.
- **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline_variant` token at **15% opacity**. High-contrast, 100% opaque borders are strictly forbidden as they "break" the premium atmosphere.

---

## 5. Components

### Cards & Lists
*   **Structure:** No divider lines. Use `8px` to `16px` of vertical white space to separate items.
*   **Nesting:** Prediction rows inside a group card should use a slightly different surface tone (e.g., `surface_container_highest`) to define the "interactive zone."
*   **Rounding:** Use `xl` (1.5rem) for main containers and `md` (0.75rem) for internal nested elements to create a "nested" visual rhythm.

### Buttons
*   **Primary:** Gradient of `primary` to `primary_container`. Bold, all-caps `label-md` typography.
*   **Secondary:** Ghost style. No background, `outline` token at 20% opacity for the border, `on_surface` text.
*   **Interactive State:** On hover, primary buttons should glow using a soft outer shadow of the `surface_tint` color.

### Chips & Tags
*   **Status Chips:** Use `secondary_container` for the background with `on_secondary_container` text. Corners should always be `full` (pill-shaped) to distinguish them from rectangular cards.

### Input Fields
*   **Prediction Inputs:** Large, centered typography (`title-lg`). The input container should be `surface_container_lowest` to look "recessed"—indicating a space to be filled.

---

## 6. Do's and Don'ts

### Do
*   **Do** use extreme contrast in font weights to guide the eye.
*   **Do** use the `primary` gold accent sparingly—it should feel like a reward or a critical action.
*   **Do** allow for "breathing room." Use the `16` (4rem) spacing token between major sections.
*   **Do** use semi-transparent overlays for "inactive" match states to keep the focus on upcoming games.

### Don't
*   **Don't** use pure white (#FFFFFF) for text. Use `on_surface` (#e5deff) to maintain the dark, premium mood and reduce eye strain.
*   **Don't** use standard "drop shadows" with small blur radii. It makes the UI look like a 2010s web-app.
*   **Don't** use vertical dividers between columns in the standings table. Use aligned text and subtle background stripes (`surface_container_low`) if necessary.
*   **Don't** use 100% opaque borders. They trap the eye and ruin the "Arena Editorial" flow.