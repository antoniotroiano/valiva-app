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

## Design v2 (decided in AP-07, approved by the author on 2026-11-22; implemented in AP-08)

Mockup: `docs/mockups/design-v2.html` (light/dark switch, desktop and 375 px, contrast table with computed values). Until AP-08 is done, the tokens and components above describe the running app; this section is the target.

### Typography (system font, 16 px base, tabular figures)

| Step    | Size / line-height   | Weight | Use                        |
| ------- | -------------------- | ------ | -------------------------- |
| Hero    | 48 / 1.05 (phone 40) | 700    | one result number per page |
| H1      | 28 / 1.2 (phone 24)  | 700    | page title                 |
| H2      | 22 / 1.3             | 600    | section                    |
| H3      | 18 / 1.35            | 600    | card title, fieldset       |
| Text    | 16 / 1.5             | 400    | default, inputs            |
| Small   | 14 / 1.45            | 400    | hints, tables, legends     |
| Caption | 13 / 1.4             | 600    | chips, groups, axis values |

Headings letter-spacing -0.01 to -0.02 em. Minimum size 13 px, inputs 16 px.

### Spacing and shape

Scale 4, 8, 12, 16, 24, 32 as tokens. Radii unchanged (card 14, field 8) plus pill. Cards: 1 px line, no shadow. Shadow only on the hero card, the active segment and the phone sheet. Fields and buttons 44 px high.

### Palette (light / dark, each defined once with `light-dark()`)

Surfaces and text: `bg #f3f6f6 / #0d1413`, `surface #ffffff / #151e1d`, `surface-2 #eaf0ef / #1e2928`, `nav-bg #fbfcfc / #111918`, `text #15201e / #e5eeec`, `muted #54635f / #9db0ac`, `accent #0f766e / #4fd1c0`, `accent-soft #dff1ee / #17332f`, `on-accent #ffffff / #052420`. `--line` (`#dde5e3 / #28353a`, 1.3:1) is decoration only and never carries information. `--field-border` (new: `#76847f / #6d807c`, 3.4 to 4.5:1) is used for inputs, segments and chart axes.

Building blocks (fixed per block, 3:1 or more against card and surface-2, label text `on-block #fff / #0d1413` at 5.0:1 or more):

| Block              | Light     | Dark      |
| ------------------ | --------- | --------- |
| ETF savings plan   | `#1d4ed8` | `#7aa2ff` |
| Statutory pension  | `#475569` | `#a9b8b4` |
| Retirement depot   | `#a21caf` | `#f08fd0` |
| Occupational (bAV) | `#b45309` | `#e0a24a` |

Four colours that each reach 3:1 against the card cannot reach 3:1 against each other (measured 1.06 to 1.51 light, 1.01 to 1.24 dark). Therefore stacked segments get a 2 px gap in card colour, every segment or legend entry carries its name and value, and a table is offered. Colour-vision check (Machado simulation): smallest colour distance dE 16 light, 13 dark.

Persons: person 1 filled, person 2 diagonal hatch in the same block colour, person 3 dotted; always labelled.

Scenarios keep their tokens and additionally differ by line style: pessimistic `#c2410c / #f59e5b` dashed, neutral `#0f766e / #4fd1c0` solid, optimistic `#4f46e5 / #a5a0ff` dotted; wish line `#b42318 / #ff8a80`.

Status chips (icon + text + colour, never colour alone), text on chip fill: ok `#166534 on #e2f4e7 / #7fdca0 on #12301f`, hint `#3b4a47 on #eaf0ef / #c0cdca on #1e2928`, warning `#8a4b00 on #fdf1e4 / #f0b46a on #2e2214`, error `#b42318 on #fde9e7 / #ff8a80 on #3a1714`. All at 5.6:1 or more.

Contrast rule: text 4.5:1, controls, focus ring and chart fills 3:1; the full pair table with values is in the mockup.

### Components

- **Result first:** hero card (large number, status chip, stacked bar against the wish, one sentence) with the wish input next to it; details collapsed below. Savings goals appear only as a link card.
- **Block page template:** inputs | result | calculation. Desktop: inputs left, result top right, calculation (collapsed groups) below it. Phone: result, calculation, inputs.
- **Navigation:** line icons as inline SVG (24 grid, stroke 1.8, no library); active item = tinted pill; small block-colour dot next to block pages. Phone: bottom tab bar and sheets exactly as approved in AP-03, now with icons in the sheet rows.
- **Empty state:** three steps with progress, one primary button for the next step, one quiet secondary action.
- **Motion:** none beyond 150 ms colour transitions; `prefers-reduced-motion` respected.
- **Not part of v2:** progress marks in the sidebar (AP-13), pensioner mode (AP-19).

## History

- 2026-11-18: first visual pass (teal accent, softer surfaces, tokens extended). Logic, texts and component structure unchanged.
- 2026-11-22: design v2 decided (AP-07, mockup approved by the author); implementation follows in AP-08.
