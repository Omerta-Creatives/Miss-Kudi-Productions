---
name: "Miss Kudi Productions — Lagos Atelier & Operations OS"
version: "1.0.0"
designRead: "Lagos Garment Atelier Identity & Floor Security Ledger — high-contrast editorial serif paired with architectural hairline grids, tactile botanical olive ink, and interactive textile CAD telemetry."
dials:
  designVariance: 8
  motionIntensity: 6
  visualDensity: 5
colors:
  primary: "#3d4f22"
  primaryHover: "#2c3a18"
  secondary: "#556b2f"
  tertiary: "#b6a18a"
  surface: "#f8f5f0"
  surfaceStone: "#f2ede4"
  surfaceElevated: "#ffffff"
  surfaceConsole: "#141a0e"
  "on-surface": "#232b18"
  "on-surface-muted": "#5c5851"
  "on-primary": "#ffffff"
  hairline: "#dcd6cc"
  hairlineStrong: "#cfc8bc"
  statusSuccessSurface: "#e9efe1"
  statusSuccessInk: "#166534"
  statusWarningSurface: "#fef3c7"
  statusWarningInk: "#92400e"
  statusErrorSurface: "#fce8e6"
  statusErrorInk: "#991b1b"
typography:
  headline:
    fontFamily: "'Playfair Display', Georgia, serif"
    fontSize: "clamp(1.95rem, 3.6vw, 2.85rem)"
    fontWeight: 600
    letterSpacing: "-0.03em"
    lineHeight: 1.12
  subheadline:
    fontFamily: "'Playfair Display', Georgia, serif"
    fontSize: "1.35rem"
    fontWeight: 600
    letterSpacing: "-0.02em"
    lineHeight: 1.25
  body:
    fontFamily: "'DM Sans', Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "'DM Sans', Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
  telemetry:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    fontVariantNumeric: "tabular-nums"
rounded:
  none: "0px"
  xs: "2px"
  sm: "4px"
  md: "6px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "20px"
  lg: "32px"
  xl: "56px"
elevation:
  flat: "none"
  subtle: "0 8px 28px rgba(35, 43, 24, 0.045)"
  modal: "0 20px 48px rgba(20, 26, 14, 0.16)"
motion:
  easingArchitectural: "cubic-bezier(0.22, 1, 0.36, 1)"
  durationFast: "180ms"
  durationBase: "320ms"
  durationScene: "560ms"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.xs}"
    minHeight: "48px"
    paddingInline: "{spacing.md}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.xs}"
    minHeight: "48px"
    paddingInline: "{spacing.md}"
  input-field:
    backgroundColor: "{colors.surfaceElevated}"
    textColor: "{colors.on-surface}"
    borderColor: "{colors.hairlineStrong}"
    fontSize: "{typography.body.fontSize}"
    rounded: "{rounded.xs}"
    minHeight: "48px"
  ledger-panel:
    backgroundColor: "{colors.surfaceElevated}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.sm}"
    shadow: "{elevation.subtle}"
---

# Miss Kudi Productions — Design System (`DESIGN.md`)

Specification structured according to [`google-labs-code/design.md`](https://github.com/google-labs-code/design.md), governed by [`nutlope/hallmark`](https://github.com/nutlope/hallmark) anti-slop quality gates, interactive WebGL/2D Canvas telemetry inspired by [`DavidHDev/canvas-ui`](https://github.com/DavidHDev/canvas-ui), and choreographed motion from [`C-Jeril/framer-motion-skills`](https://github.com/C-Jeril/framer-motion-skills), [`greensock/gsap-skills`](https://github.com/greensock/gsap-skills), and [`oso95/scroll-world`](https://github.com/oso95/scroll-world).

## Overview

Miss Kudi Productions is a Lagos-headquartered B2B garment manufacturing partner operating three specialized plants across Yaba, Victoria Island, and Ikeja. Every interface balances **editorial fashion atelier craft** with **industrial AQL 2.5 floor precision**. Instead of generic SaaS card grids or neon dark-mode gradients, surfaces evoke unbleached pattern paper, woven damask labels, brass pattern weights, and structured production tickets.

## Colors

- **Atelier Paper (`{colors.surface}` · `#f8f5f0`) & Warm Stone (`{colors.surfaceStone}` · `#f2ede4`):** Primary page canvas and secondary grouping wells. Never substitute sterile `#f9fafb` cool gray.
- **Crisp Ledger Surface (`{colors.surfaceElevated}` · `#ffffff`):** Reserved for interactive form desks, job tickets, and specification ledgers framed by `1px solid` `{colors.hairline}` (`#dcd6cc`).
- **Botanical Olive Ink (`{colors.primary}` · `#3d4f22`):** Primary brand action color, active navigation pill fill, focus rings, and native control `accent-color`. Hover deepens to `{colors.primaryHover}` (`#2c3a18`).
- **Warm Charcoal Copy (`{colors.on-surface}` · `#232b18`):** All primary prose and headings; pure `#000000` is banned.
- **Taupe Brass (`{colors.tertiary}` · `#b6a18a`):** Used in CAD weave canvases, ruler ticks, and understated structural dividers.
- **Console Header (`{colors.surfaceConsole}` · `#141a0e`):** Strictly scoped to the internal RBAC session strip on in-house operations routes (`/superadmin`, `/dashboard`, `/workspace`, `/tracker`, `/login`, `/reset-password`).

## Typography

- **Editorial Headlines (`{typography.headline.fontFamily}`):** Set in `Playfair Display` with tight `-0.03em` tracking, `text-wrap: balance`, and selective italic emphasis for craft contrast.
- **Interface & Form Labels (`{typography.label.fontFamily}`):** Set in `DM Sans` (`0.875rem`, weight `600`, natural sentence case). Per Hallmark `sloplint`, regular `<label>` elements must use readable sentence case rather than tracked-out tiny all-caps.
- **Form Inputs (`{typography.body.fontSize}`):** Always `1rem` (`16px`) minimum on `<input>`, `<select>`, and `<textarea>` to prevent mobile iOS viewport auto-zoom while typing.
- **Technical Telemetry (`{typography.telemetry.fontFamily}`):** Monospace with `font-variant-numeric: tabular-nums` for Job Codes (`MKP-YYYYMMDD-NNN`), 6-digit OTP verification codes, session countdowns, GSM weights, and NGN (`₦`) accounting ledgers.

## Layout

- **Asymmetrical Split & Numbered Ledgers:** Avoid repeating uniform 3-card or 4-card equal grids. Pair a focused primary workspace (`0.92fr`) with an editorial telemetry & directory ledger (`1.08fr`) on desktop, collapsing cleanly to a single-column scan path below `960px`.
- **Keyboard-Safe Form Placement:** On `/login` and `/reset-password`, keep primary email, password/OTP inputs, Remember Me control, and submit CTA near the top of the viewport so mobile virtual keyboards never obscure the action button.
- **Coarse Pointer Ergonomics:** Every interactive button, checkbox row, and input maintains at least `48px` block height (`52px` under `@media (pointer: coarse)`), with Gestalt proximity keeping label-to-input spacing (`6px`) tighter than group-to-group spacing (`18px`).

## Elevation & Depth

- Depth comes from `1px solid` `{colors.hairline}` borders, paper-to-white tonal contrast, and ultra-diffuse `{elevation.subtle}` (`< 0.05` alpha).
- Heavy drop shadows, blurred neon glows, and glassmorphic rainbow backdrops are strictly prohibited.

## Shapes

- Architectural corners use `{rounded.xs}` (`2px`) on buttons and inputs and `{rounded.sm}` (`4px`) on ledger panels and modal dialogs, mirroring cut pattern card stock and woven garment labels.

## Components

- **Primary & Secondary Actions (`button-primary`, `button-secondary`):** Never place two filled primary buttons side-by-side (Hallmark `sloplint` rule); pair one filled `{colors.primary}` CTA with a hairline `{colors.surface}` secondary action or inline text link.
- **Authentication & Recovery Controls (`input-field`):**
  - Email fields use `type="email"`, `autocomplete="username"`, `spellcheck="false"`, `autocapitalize="none"`, `autocorrect="off"`, and `enterkeyhint="next"`.
  - Sign-in passwords use `autocomplete="current-password"`; password resets and provisioning use `autocomplete="new-password"` with complexity rules placed **above** the input via `aria-describedby`.
  - Validation feedback defers until interaction using `:user-invalid` / `:user-valid` synchronized with `aria-invalid` on `blur` and `input`.
  - 6-digit OTP verification uses a **single** `<input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\d{6}">` styled with monospace letter-spacing and progressive WebOTP (`OTPCredential` + `AbortController` + `form.requestSubmit()`).
- **Atelier Weave Canvas (`AtelierWeaveCanvas`):** GPU-friendly `<canvas>` warp-and-weft CAD pattern visualizer blending live DOM telemetry badges over responsive thread harmonics (`DavidHDev/canvas-ui` pattern), reacting to pointer coordinates, scroll depth, and authentication state changes.

## Motion & Micro-interactions

- **Choreography (`framer-motion` / GSAP / Scroll-World principles):**
  - Animate exclusively compositor-safe `transform` (`translate3d`, `scale`) and `opacity` using `{motion.easingArchitectural}` (`cubic-bezier(0.22, 1, 0.36, 1)`).
  - Step transitions inside `/login` and `/reset-password` use `AnimatePresence mode="wait"` with subtle `10px` vertical travel and `220ms` duration so state changes feel crisp and mechanical, never sluggish.
  - Scroll-linked parallax plates scrub smoothly via `useScroll` and `useTransform` without layout thrashing.
- **Reduced Motion Guardrail:** Always check `useReducedMotion()` and `@media (prefers-reduced-motion: reduce)` to freeze canvas wave oscillation and instant-swap transitions when requested by the operating system.

## Do's and Don'ts

- **Do** enforce real server-verified `HttpOnly; SameSite=Lax` signed session cookies (`__Host-mkp_session` over HTTPS, `mkp_session` on `localhost`) with explicit 30-day **Remember Me** vs. 8-hour **Floor Shift** lifetimes.
- **Do** place field hints and password requirements **above** `<input>` elements so browser autofill popovers and mobile keyboards never cover instructions.
- **Don't** split 6-digit OTP codes into six separate `<input maxlength="1">` boxes, block password pasting, or ask users to type new passwords twice.
- **Don't** use AI cliché tropes: no purple/indigo gradients, no generic placeholder avatars, no tracked-out 9px uppercase form `<label>` text, and no unauthenticated privilege escalation in client headers.
