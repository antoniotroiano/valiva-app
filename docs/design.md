# Visual design

Calm, modern dashboard. Implemented only in `apps/web/src/styles/` (`tokens.css`, `base.css`, `layout.css`, `components.css`, `pages.css`, `print.css`, assembled by `index.css`); components use class names and CSS variables, never hard-coded colours. Concept basis: `concept/05-ui-concept.md` §5.

## Principles

- Numbers come first: no decoration that competes with figures.
- One accent colour (teal), used for primary state only (current page, selection, progress, links).
- Soft surfaces: tinted neutrals, 14 px card radius, a single subtle shadow.
- Scenarios are never distinguished by colour alone (line style and legend labels stay).
- Light and dark share the same tokens; dark follows the system or the manual switch.

## Tokens

| Token                                               | Purpose                                                                                |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `--bg`, `--surface`, `--surface-2`, `--nav-bg`      | page, card, hover/track, sidebar                                                       |
| `--text`, `--muted`, `--line`, `--field-border`     | text, secondary text, dividers, input borders                                          |
| `--accent`, `--accent-soft`, `--on-accent`          | primary colour, its tint, text on it                                                   |
| `--danger`, `--warn-soft`                           | errors, warning notices                                                                |
| `--c-contrib`, `--c-pess`, `--c-neutral`, `--c-opt` | chart series: contributions, pessimistic (orange), neutral (teal), optimistic (indigo) |
| `--radius`, `--radius-sm`, `--shadow`, `--font`     | shape and type                                                                         |

Typography: system sans stack (no webfont, no extra dependency), 15 px base, headings with slightly negative letter-spacing, tabular figures for all numbers.

## Components

- **Sidebar:** sticky, own surface; current page = tinted background plus accent text (no solid fill).
- **Cards / KPI tiles:** border, soft shadow, no nested cards.
- **Inputs and buttons:** 8 px radius, hover and focus states, visible 3 px focus ring.
- **Segmented control** (`.seg`): pill track with a raised active segment.
- **Notices:** full tinted border and background (no side stripes); orange for warnings, teal for info.
- **Tables:** muted header row, row hover, right-aligned tabular numbers.
- **Motion:** 150 ms colour transitions only; disabled under `prefers-reduced-motion`.

## Changing the look

Edit `styles/tokens.css`. Each colour is defined once as `light-dark(light, dark)`; `color-scheme` (system, or `data-theme`) picks the side. Check contrast: body text at least 4.5:1, borders of inputs at least 3:1.

## History

- 2026-11-18: first visual pass (teal accent, softer surfaces, tokens extended). Logic, texts and component structure unchanged.
