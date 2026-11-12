---
name: "Miss Kudi Productions — Lagos Garment Manufacturing Atelier"
version: "2.0.0"
genre: "editorial"
posture: "restrained"
colors:
  primary: "#3d4f22"
  primaryHover: "#2c3a18"
  secondary: "#556b2f"
  tertiary: "#b6a18a"
  surface: "#f8f5f0"
  surfaceWarm: "#f4efe7"
  surfaceStone: "#ede6da"
  surfaceElevated: "#fdfcf9"
  surfaceConsole: "#141a0e"
  "on-surface": "#232b18"
  "on-surface-muted": "#5a564f"
  "on-primary": "#fdfcf9"
  hairline: "#dbd5ca"
  hairlineStrong: "#cbc3b6"
  statusSuccessSurface: "#e9efe1"
  statusSuccessInk: "#166534"
  statusWarningSurface: "#fef3c7"
  statusWarningInk: "#92400e"
  statusErrorSurface: "#fce8e6"
  statusErrorInk: "#991b1b"
typography:
  headline:
    fontFamily: "'Cormorant Garamond', Georgia, serif"
    fontSize: "clamp(1.875rem, 2.4vw + 1rem, 3.125rem)"
    fontWeight: 600
    fontStyle: "normal"
    letterSpacing: "-0.025em"
    lineHeight: 1.12
  subheadline:
    fontFamily: "'Cormorant Garamond', Georgia, serif"
    fontSize: "clamp(1.2rem, 0.7vw + 0.9rem, 1.55rem)"
    fontWeight: 600
    fontStyle: "normal"
    letterSpacing: "-0.015em"
    lineHeight: 1.24
  body:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
  mono:
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    fontVariantNumeric: "tabular-nums"
rounded:
  none: "0px"
  control: "4px"
  card: "6px"
  pill: "999px"
spacing:
  2xs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  2xl: "64px"
elevation:
  flat: "none"
  subtle: "0 8px 24px rgba(35, 43, 24, 0.045)"
  modal: "0 20px 48px rgba(20, 26, 14, 0.16)"
motion:
  easeOut: "cubic-bezier(0.22, 1, 0.36, 1)"
  durationShort: "160ms"
  durationMed: "280ms"
  durationLong: "480ms"
---

# Miss Kudi Productions — Design System (`DESIGN.md`)

Governed by [Hallmark v2.0](https://github.com/nutlope/hallmark) (`editorial` genre, `restrained` posture) and tokenized across `src/app/tokens.css`, `src/app/base.css`, and `src/app/globals.css`.

## Overview

Miss Kudi Productions is a B2B garment manufacturing atelier at **1 Alawode Street, Surulere, Lagos**, operating three specialized divisions across Surulere, Victoria Island, and Ikeja. Surfaces draw from unbleached pattern paper, warm ivory spec sheets, botanical olive ink, brass pattern weights, and structured factory job tickets.

## Colors

- **Atelier Paper (`--color-paper` · `#f8f5f0`) & Warm Stone (`--color-paper-3` · `#ede6da`):** Primary page canvas and secondary grouping wells. Cool `#f9fafb` grays and pure `#ffffff` page backgrounds are prohibited.
- **Warm Ivory Ledger (`--color-elevated` · `#fdfcf9`):** Used for form desks, production job tickets, and specification tables framed by `1px solid var(--color-rule)` (`#dbd5ca`).
- **Botanical Olive Ink (`--color-accent` · `#3d4f22`):** Primary action fill, active navigation state, focus rings, and form `accent-color`. Hover deepens to `--color-accent-hover` (`#2c3a18`).
- **Warm Charcoal Copy (`--color-ink` · `#232b18`):** Primary headings and body prose; pure `#000000` is prohibited.
- **Taupe Brass (`--color-gold` · `#b6a18a`):** Used in pattern weave canvases, ruler ticks, and understated rules.
- **Console Header (`--color-console` · `#141a0e`):** Scoped to the dark hero stage and the internal session bar on studio routes (`/superadmin`, `/dashboard`, `/workspace`, `/tracker`, `/login`, `/reset-password`).

## Typography

- **Roman Editorial Headlines (`Cormorant Garamond`):** Set in roman upright weight (`600`) with `-0.025em` tracking and `text-wrap: balance`. Italic emphasis inside display headings and tracked-out eyebrow kickers above headings are avoided per Hallmark editorial gates.
- **Interface & Form Copy (`Plus Jakarta Sans`):** Readable sentence-case labels (`0.875rem`, weight `600`) and `1rem` (`16px`) minimum form control text so mobile browsers never auto-zoom on focus.
- **Tabular Figures (`JetBrains Mono`):** Used with `font-variant-numeric: tabular-nums` for Job Codes (`MKP-YYYYMMDD-NNN`), measurement matrices, fabric yardage, and NGN (`₦`) ledgers.

## Layout & Rhythm

- **4px Spatial Rhythm:** All spacing tokens step on a 4px grid (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `40px`, `48px`, `64px`, `96px`).
- **Editorial Ledger Splits:** Pair asymmetric lead columns with specification tables and numbered production milestones rather than uniform SaaS card walls, collapsing cleanly to single-column mobile stacks below `960px`.
- **Touch & Keyboard Ergonomics:** Interactive buttons and form fields maintain a `44px–48px` minimum hit target (`52px` on coarse pointers), with field hints placed above inputs so autofill popovers and mobile keyboards never obscure instructions.

## Components & Iconography

- **Action Hierarchy:** One filled primary action (`button-dark` or `hero-fs-btn-gold`) paired with an outline or quiet secondary action (`button-light`). Labels stay concise (four words or fewer) without trailing Unicode arrow dingbats.
- **Accessible Vector Icons (`UiIcon`):** All interface icons render crisp `1.5px` stroke SVGs with explicit `aria-hidden="true"` rather than emoji glyphs.
- **Modal Elevation:** Dialogs (`.mkp-dialog`) rely on modal elevation (`--shadow-modal`) without redundant outer hairline borders.

## Motion

- **Compositor-Safe Transitions:** Transitions animate `transform` and `opacity` using `--ease-out` (`cubic-bezier(0.22, 1, 0.36, 1)`), with full `@media (prefers-reduced-motion: reduce)` support across `base.css` and `globals.css`.
