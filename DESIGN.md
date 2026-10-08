# Impact Lab design system

## Overview

Impact Lab is an English-only, one-page liquidity experiment for curious Ethereum holders. It uses a warm off-white canvas, white experiment surface, blue controls and data, restrained monospace annotations, and a simple custom Ethereum/ripple illustration. Its independent name and icon do not imitate an existing site's identity.

The page moves from a short introduction to a two-part experiment, an explanation, methodology disclosure, and the visible community note. The desktop experiment places inputs beside results. Smaller frames put controls first and add a compact result beside them. Source of truth: `src/styles.css`, `src/main.tsx`, `src/model.ts`, and `public/icon.svg`.

## Colors

All values are sRGB hex. Primitives live at the top of `src/styles.css`; components mainly consume semantic aliases. Only the light theme exists.

| Semantic token | Primitive / value | Use |
| --- | --- | --- |
| `--surface-page` | `--neutral-50`, `#f5f5f0` | Page canvas |
| `--surface-card` | `--neutral-0`, `#ffffff` | Main experiment and inputs |
| `--surface-inset` | `--neutral-100`, `#eeefe9` | Neutral impact badge |
| `--surface-accent`, `--chart-fill` | `--blue-50`, `#eff3ff` | Comparison, selected preset, mobile result, chart area |
| `--text-primary` | `--neutral-900`, `#222b23` | Headings and primary values |
| `--text-secondary`, `--chart-comparison` | `--neutral-600`, `#62685e` | Supporting text and dashed comparison curve |
| `--text-on-accent` | `--neutral-0`, `#ffffff` | Primary button label |
| `--border-subtle` | `--neutral-200`, `#dcded6` | Structural dividers and chart grid |
| `--border-control` | `--neutral-500`, `#7c8278` | Input and unselected preset outlines |
| `--accent`, `--focus` | `--blue-600`, `#2456db` | Primary action, selected control, focus, current-pool curve |
| `--accent-hover` | `--blue-700`, `#1944b7` | Primary hover and illustration facet |
| `--status-bg` | `--amber-50`, `#fff3db` | Large-impact badge background |
| `--status-text` | `--amber-800`, `#875000` | Large-impact badge text |
| `--error` | `--red-700`, `#ae2929` | Input error text and border |

`--blue-100` (`#e3eaff`) is the selection background; selected text keeps `--text-primary`. Blue represents the experiment's active input/output relationship as well as its controls. The solid and dashed chart lines also distinguish the two series without color. Impact magnitudes have explicit labels.

Measured WCAG 2 contrast: primary/page 13.35:1, secondary/page 5.24:1, secondary/card 5.74:1, white/primary action 6.12:1, blue/accent surface 5.52:1, secondary/accent surface 5.17:1, control outline/card 3.95:1, focus/page 5.60:1, amber status 6.01:1, error/card 6.67:1. Measurements and corresponding rendered colors are in `artifacts/browser-checks.json` and `artifacts/additional-contrast.json`.

## Typography

No font assets or font downloads are needed. Body uses `Arial, Helvetica, sans-serif`; annotations and axes use `'Courier New', monospace`. These are platform fonts: glyphs and exact face selection may vary by OS. Requested weights are 400, 500, 600, and 700; no custom variable font or italic face is supplied. `font-synthesis: none` prevents synthetic styling; intermediate requested weights use available platform faces.

| Role | Implemented size | Treatment |
| --- | --- | --- |
| Caption | `--text-caption: .75rem` | Status, hints, small labels |
| Small | `--text-small: .8125rem` | Chart title, secondary controls |
| Label | `--text-label: .875rem` | Form labels, explanatory copy |
| Body | `--text-body: 1rem` | Base copy and section headings |
| Section | `--text-section: 1.125rem` | Header identity |
| Hero | `clamp(2.5rem, 5.3vw, 4rem)`; `2.875rem` below 30rem | Weight 500, line height 1.04, tracking −.065em |
| Main output | `clamp(2rem, 3.6vw, 2.75rem)`; `2.125rem` below 30rem | Line height 1.2, tracking −.06em |
| Swap input | `1.75rem` | Line height 1.3, tabular figures |
| Metrics | `1.25rem`; `1.125rem` below 30rem | Weight 500, tracking −.03em |
| Axes / tiny annotations | `.6875rem` | Compact supplemental context; main values repeat in readable text |

Body line height is 1.55; intro 1.65; takeaway 1.7; result explanation 1.6; section headings 1.4. Headings use balanced wrapping and prose uses pretty wrapping. Useful text is selectable. Changing numeric values use tabular figures. Long outputs wrap instead of being truncated. Reserve inputs inherit at least 1rem. Intro copy is capped at 53ch, takeaway at 70ch, and expanded methodology at 76ch.

## Layout

The `.page-shell` max width is 1120px, centered with 32px inline padding. The desktop `.experiment` grid is `340px minmax(0, 1fr)` with 24px panel padding. DOM order always follows controls, results, explanation. There is no sticky overlay or nested horizontal scrolling.

Spacing tokens are 4, 8, 12, 16, 20, 24, 32, 40, and 48px (`--space-1` through `--space-12`, using the named steps in source). Use small gaps within groups and 20–32px between groups. Borderless controls have a 44px minimum height. Preset buttons use an auto-fitting grid with a minimum of `min(100%, 4.75rem)` so enlarged labels can wrap into separate rows.

Responsive rules in `src/styles.css`:

- At 60rem and below: page padding 24px, first column 300px, panel padding 20px, smaller illustration, metric units below their values.
- At 47rem and below: one-column experiment; panel padding 24px; compact mobile result and chart anchor appear; header subtitle and formula ornament disappear; footer becomes one column.
- At 30rem and below: page padding 16px; panel padding 20px; shorter header; illustration removed; narrower type and metric gaps; full-width primary action.

The chart's labels live in HTML so they do not shrink with its SVG. Plot strokes use `vector-effect: non-scaling-stroke`; plot height is 9.5625rem on desktop and 10.9375rem in the stacked layout. Axis gutter is 2.25rem. This spacing grows when text is enlarged.

Observed: no document overflow at 320, 360, 600, 751, 752, 960, and 1200 CSS pixels, including maximum numeric values at 320px. Default screenshots were inspected at 360px and 1200px; enlarged text was inspected at 1200px. Native browser zoom and physical devices were not checked.

## Elevation & Depth

The system is flat. White and tinted surfaces group related content; 1px borders communicate structure. There are no modal overlays, floating shadows, gradients, or page-load animations. Inset selected-control shadow and the tiny chart-point ring indicate state, not elevation.

## Shapes

`--radius-panel` is 16px; `--radius-control` is 8px. Primary actions use 6px; status badges 5px. Inputs and presets have 1px control borders; selected presets add a 1px inset blue ring. The chart point is an 11px circle with a 2px white border and 1px blue ring. The icon's SVG has an 11-unit radius in a 40-unit square. The page does not clip overflowing text to achieve its rounded corners.

## Components

These are local components/patterns, not a separately published component library.

- **`App` (`src/main.tsx`)** owns string inputs, validated numeric values, the custom disclosure, and status announcements. All derived quotes come from `quote` in `src/model.ts`. No persistent storage is used.
- **Pool preset controls** use a native fieldset, legend, buttons, and `aria-pressed`. Exact matching reserves determine selection; custom/doubled pools can have none selected. The visible reserve summary explains that state.
- **Amount and reserve inputs** have persistent labels, decimal input hints, `aria-invalid`, and associated inline errors. Invalid input replaces all result content with recovery guidance. The native slider also works with arrow/Home/End keys. The zero state is a valid calculation.
- **`ImpactChart({ reserve, amount })`** draws a solid current-pool curve, dashed double-liquidity curve, and current trade marker. Its accessible image label states the current amount and both impacts; the surrounding metrics repeat the important result. It is informative, not a draggable control.
- **Result and comparison patterns** show output, impact, input fee, and average rate. `Try 2× liquidity` doubles both reserves. The native disabled state and explicit limit label appear when either reserve would exceed the model bounds.
- **Native `details` disclosures** expose custom reserves and methodology. The plus rotates when open. A recovery button opens and focuses a hidden invalid reserve field.
- **`Arrow({ diagonal })`** is a local decorative SVG using `currentColor` and a 1.8px stroke; no icon library is fetched. The main illustration is inline SVG and `public/icon.svg` is local.
- **Focus/status patterns** use a first-focusable skip link, 3px blue focus outline with 4px offset, and a stable polite status region updated after a 500ms input pause. No screen-reader session was run.

Hover color changes only apply on hover-capable devices. Under `prefers-reduced-motion: no-preference`, buttons transition background, text color, and transform for 120ms, and press to scale .96. Reduced motion disables these transitions. Forced-colors mode uses system focus and chart colors, a stronger selected border, and a visible action border. There are no network loading states, dialogs, or destructive actions.

## Do's and Don'ts

- Reuse semantic tokens and existing spacing steps; retain the clear controls/results reading order.
- Keep one filled primary action in a result state. Show active selection with a border and tint, not another competing solid action.
- Keep the calculation vocabulary consistent: reserve, swap amount, price impact, pool fee, average rate.
- Preserve numeric bounds, inline repair instructions, and the distinction between approximate simulation and execution.
- Keep asset URLs relative and data local. Do not add a wallet, market API, remote font, or runtime script loader.
- When adding a related experiment, begin with `.page-shell`, labeled native controls, the existing section heading pattern, and a result panel; supply text equivalents for charts and test at both target widths. A new page's composition need not repeat this hero illustration.

The design/review guidance and documentation method are attributed in `artifacts/NOTICE.md`; their licenses are preserved in `artifacts/guidance-LICENSE.txt`.
