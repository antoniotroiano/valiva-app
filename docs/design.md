# Visual design

Calm, modern dashboard. Implemented only in `apps/web/src/styles/` (`tokens.css`, `base.css`, `layout.css`, `components.css`, `pages.css`, `print.css`, assembled by `index.css`); components use class names and CSS variables, never hard-coded colours. Concept basis: `concept/05-ui-concept.md` §5.

## Principles

- Numbers come first: no decoration that competes with figures.
- One accent colour (teal), used for primary state only (current page, selection, progress, links).
- Colour with meaning: one fixed colour per building block, status as chip (icon + text + colour), never colour alone.
- Calm surfaces: tinted neutrals, 14 px card radius, 1 px line, no shadow on cards.
- Scenarios are never distinguished by colour alone (line style and legend labels stay).
- Light and dark share the same tokens; dark follows the system or the manual switch.

## Tokens (`styles/tokens.css`)

Each colour is defined once as `light-dark(light, dark)`; `color-scheme` (system, or `data-theme`) picks the side. Values and contrast in "Design v2" below; `apps/web/test/tokenContrast.test.ts` checks every pairing.

| Token                                                                       | Purpose                                                             |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `--bg`, `--surface`, `--surface-2`, `--nav-bg`                              | page, card, hover/track, sidebar                                    |
| `--text`, `--muted`, `--line`, `--field-border`                             | text, secondary text, decoration only, inputs/segments/chart axes   |
| `--accent`, `--accent-soft`, `--on-accent`, `--focus`                       | primary colour, its tint, text on it, focus ring                    |
| `--b-etf`, `--b-stat`, `--b-dep`, `--b-bav`, `--on-block`                   | building blocks (charts, sidebar dot, chips) and label text on them |
| `--ok-*`, `--hint-*`, `--warn-*`, `--bad-*` (`-fg/-bg/-bd`)                 | status chips and notices                                            |
| `--c-contrib`, `--c-pess`, `--c-neutral`, `--c-opt`, `--wish`               | chart series (scenarios also by line style) and the wish line       |
| `--danger`, `--ok`                                                          | error text, positive text (older tokens, still used)                |
| `--s1` … `--s6`                                                             | spacing scale 4, 8, 12, 16, 24, 32                                  |
| `--fs-hero/h1/h2/h3/text/small/caption`                                     | type scale 48, 28, 22, 18, 16, 14, 13 px                            |
| `--radius`, `--radius-sm`, `--radius-pill`, `--shadow`, `--scrim`, `--font` | shape, raised shadow, sheet backdrop, type                          |

Typography: system sans stack (no webfont), 16 px base, tabular figures everywhere, headings with slightly negative letter-spacing. Phone: H1 24, Hero 40.

## Components

- **Sidebar:** sticky, own surface; line icons (`components/layout/Icon.tsx`, inline SVG, no library); current page = tinted pill with accent text; block pages carry a colour dot (colour key, not a status); theme switch at the bottom.
- **Phone navigation:** slim top bar, fixed bottom tab bar with icons and pill, sheets "Inputs" and "More" with icons, block dots and a grab handle (behaviour as approved in AP-03).
- **Cards / `KpiTile`:** border, no shadow; `hero` variant: 48 px number on a raised card.
- **`StatusChip`:** `ok`, `hint`, `warn`, `error`; icon + text + colour.
- **`EmptyState`:** title, text, optional steps with progress, one primary button, one quiet secondary action.
- **Inputs and buttons:** 44 px high, 8 px radius, visible 3 px focus ring; `.btn.primary`, `.btn.quiet`.
- **Segmented control** (`.seg`): pill track with border, active segment raised with accent ring.
- **Notices:** full tinted border and background (no side stripes); orange for warnings, grey for info.
- **Tables:** muted header row, row hover, right-aligned tabular numbers, 14 px.
- **Charts** (`components/charts/chartTheme.tsx`): block colours, 2 px gap in card colour between stacked segments, value inside a segment only from 64 px width (legend and table otherwise), persons as one base colour with filled / hatched / dotted / cross-hatched variants (same patterns in the legend), axes in `--field-border`, wish line `--wish` dashed.
- **Motion:** 150 ms colour transitions only; disabled under `prefers-reduced-motion`.

## Changing the look

Edit `styles/tokens.css`. Check contrast with `npm test` (`tokenContrast.test.ts`) and the axe tests in light and dark: body text at least 4.5:1, borders of inputs and chart fills at least 3:1.

## Design v2 (decided in AP-07, approved by the author on 2026-11-22; foundations implemented in AP-08)

Mockup: `docs/mockups/design-v2.html` (light/dark switch, desktop and 375 px, contrast table with computed values). AP-08 built the foundations above (tokens, type and spacing scale, navigation, chips, empty state, charts). The page layouts below (result first, block page template) follow in AP-09 to AP-12.

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

- **Result first (AP-09, built):** hero card (large number, status chip, bar against the wish, one sentence, block status chips) with the wish input next to it, scenario switch below, composition, then "More" as collapsible rows (`Disclosure`, `.dts`). Important notes and invalid input stand above the page head, other notes are collapsed with their count. Savings goals are only a link card.
- **Person switcher (AP-09):** one switcher in the page head (`PersonTabs`; overview: household + persons, other pages: persons; more than three options become a select). The active person is part of the heading of block pages. No person select in the sidebar or the phone top bar.
- **Block page template (AP-10 built, AP-11 applied it to Depot, bAV and statutory pension):** `BlockPage` / `BlockSection` (`components/layout/BlockPage.tsx`, `styles/blocks.css`): inputs | result | calculation. Desktop: inputs left (340 px), result top right and sticky, calculation (collapsed rows) below it. Phone: result, inputs, calculation (changed from result, calculation, inputs: the sticky result strip keeps the figures visible while typing). Pages with several parts get a jump list and a result strip under the phone top bar. Shared pieces: `ResultFrame`, `StepsTable`, `ScenarioTable`, `WarningList`. Mockup: `docs/mockups/etf-ap10.html`.
- **Notes by weight (AP-11):** `important` notes (`ImportantNotes`) stay visible above the result; `info` notes sit in one collapsed row "Hinweise zur Rechnung" with a count (`InfoNotes`). Core codes take their weight from `warningWeight`.
- **Help text (AP-11):** one sentence per field, details behind "Mehr erfahren" (`more`, `MoreInfo`); a field with an error opens its own "Mehr erfahren", a collapsed input group with an error opens too.
- **Allowances per year (AP-11):** table from 640 px, below it a card list (sum card first, then five years, button "Alle … Jahre anzeigen"); print uses the table. Mockup: `docs/mockups/depot-ap11.html`. Phone key figures of a result sit in two columns.
- **Navigation:** line icons as inline SVG (24 grid, stroke 1.8, no library); active item = tinted pill; small block-colour dot next to block pages. Phone: bottom tab bar and sheets exactly as approved in AP-03, now with icons in the sheet rows.
- **Empty state:** three steps with progress, one primary button for the next step, one quiet secondary action.
- **Motion:** none beyond 150 ms colour transitions; `prefers-reduced-motion` respected.
- **Not part of v2:** progress marks in the sidebar (AP-13), pensioner mode (AP-19).

## History

- 2026-11-18: first visual pass (teal accent, softer surfaces, tokens extended). Logic, texts and component structure unchanged.
- 2026-11-22: design v2 decided (AP-07, mockup approved by the author).
- 2026-11-22: AP-08 implemented the foundations: tokens (spacing, type, block and status colours), 16 px base, navigation icons, `StatusChip`, `EmptyState`, hero `KpiTile`, chart palettes with person patterns. Differences to the mockup: page layouts (AP-09 to AP-12), household chart stacks by person, no "Inputs" sidebar group yet.
- 2026-11-22: AP-09 built the result-first retirement plan and the single person switcher (mockup `docs/mockups/rentenplan-ap09.html`). "Verlauf" is collapsed by default to keep the page under the height target.
- 2026-11-23: AP-10 built the block page template and the two-part ETF page; the note on shared values moved under the page heading.
- 2026-11-23: AP-11 applied the block page template to Depot, bAV and statutory pension (visible words 596/728/471 down to 277/260/191); allowances as card list on phones.
