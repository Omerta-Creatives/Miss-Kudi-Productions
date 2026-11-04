# Miss Kudi Productions — B2B Garment Manufacturing & Factory Operations OS

End-to-end **B2B Apparel Manufacturing Atelier** and **Multi-Facility Factory Operations OS** built for **Miss Kudi Productions** across three Lagos, Nigeria production plants:
- **MKP-LOS-01 — Yaba Flagship Production Plant** (Woven RTW, CAD pattern grading, bulk apparel assembly)
- **MKP-LOS-02 — Victoria Island Bespoke & Bridal Atelier** (Couture sampling, capsule tailoring, luxury hand-finishing)
- **MKP-LOS-03 — Ikeja Bulk Uniform & Industrial Depot** (High-volume corporate, hospitality, and export uniform runs)

---

## Application Screenshots

### 1. Public Editorial Atelier & B2B Quote Studio (Desktop `1440×900`)

| Fullscreen 3D Production Journey Hero (`/`) | Live MOQ, Yardage & Size Ratio Estimator (`/quote`) |
| --- | --- |
| ![Landing Page Editorial Hero](public/screenshots/01-landing-atelier-desktop.png) | ![Live Quote & MOQ Estimator](public/screenshots/06-quote-estimator-desktop.png) |

### 2. Authentication Desk & Three-Tier Factory Consoles (Desktop `1440×900`)

| Staff & Admin Sign-In + CAD Weave Plate (`/login`) | Superadmin Multi-Facility HQ (`/superadmin`) |
| --- | --- |
| ![Staff and Admin Authentication Portal](public/screenshots/02-auth-portal-desktop.png) | ![Superadmin Multi-Facility HQ](public/screenshots/03-superadmin-hq-desktop.png) |

| Plant Admin & Artisan Station Console (`/dashboard`) | 5-Stage Pipeline, Inventory & Ledger OS (`/workspace`) |
| --- | --- |
| ![Plant Admin and Staff Console](public/screenshots/04-admin-dashboard-desktop.png) | ![Factory Operations Workspace](public/screenshots/05-factory-workspace-desktop.png) |

### 3. Mobile-Responsive Experience (`390×844` iPhone Viewport)

| Mobile Editorial Hero (`/`) | Mobile Auth & OTP Portal (`/login`) | Mobile Plant Admin Console (`/dashboard`) |
| --- | --- | --- |
| ![Mobile Landing Hero](public/screenshots/07-mobile-landing-hero.png) | ![Mobile Auth Portal](public/screenshots/08-mobile-auth-portal.png) | ![Mobile Admin Dashboard](public/screenshots/09-mobile-admin-dashboard.png) |

---

## Key Architecture & Product Capabilities

### 1. End-to-End Admin & Staff Authentication, Sessions & Recovery
- **Cryptographic Password Hashing (`PBKDF2-SHA256`)**: Implemented in [`src/app/lib/auth-server.ts`](src/app/lib/auth-server.ts) using Web/Node `crypto` (`120,000` iterations, random 128-bit salt, timing-safe `timingSafeEqual` verification) with minimum 12-character policy enforcement and 5-attempt / 15-minute brute-force lockout protection.
- **Signed Session Cookies & Remember Me**: Issues `HttpOnly`, `SameSite=Lax` HMAC-SHA256 cookies (`__Host-mkp_session` over HTTPS, `mkp_session` on localhost) supporting **30-day trusted workstation persistence (`Remember Me`)** or **8-hour floor shift expiration**.
- **6-Digit OTP Password Reset (`/reset-password`)**: Anti-enumeration challenge flow issuing sealed 10-minute OTP tokens with **WebOTP / SMS autofill (`autocomplete="one-time-code"`)** and automatic post-reset login.
- **Authenticated Password Rotation & Admin Provisioning**: In-session password rotation (`/login?mode=change-password`) plus initial password provisioning and password resets inside [`/superadmin`](src/app/superadmin/page.tsx), [`/dashboard`](src/app/dashboard/page.tsx), and [`/workspace`](src/app/workspace/page.tsx) Staff CRUD modals.
- **Edge/Node Route Guard (`Next.js 16 Proxy`)**: [`src/proxy.ts`](src/proxy.ts) enforces cryptographic cookie + tier authorization across `/superadmin`, `/dashboard`, `/workspace`, and `/tracker`, while `guardSameOriginMutation()` protects state-changing API endpoints via `Sec-Fetch-Site` Fetch Metadata headers.

### 2. Three-Tier Role-Based Access Control (`superadmin`, `admin`, `staff`)
- **[`/superadmin`](src/app/superadmin/page.tsx) — Superadmin Global HQ**:
  - Consolidated multi-plant revenue, COGS, OpEx, and yield telemetry across Yaba, Victoria Island, and Ikeja.
  - Full CRUD for factory branches, global staff/admin provisioning, password resets, NeonDB table health verification, and immutable audit trail inspection.
- **[`/dashboard`](src/app/dashboard/page.tsx) — Role-Adaptive Plant Admin & Floor Terminal**:
  - **Plant Admin (`admin` / `superadmin`)**: Plant P&L, fabric stockout runway alerts, production velocity, order creation/editing, and staff scheduling.
  - **Floor Specialist (`staff`)**: Role-tailored workstation for **Pattern Designers**, **Cutting Masters**, **Master Tailors**, and **Quality Control (QC) Inspectors** with shift clock toggles (`CLOCKED_IN`, `BREAK`, `OFF_SHIFT`) and one-tap batch logging.
- **[`/workspace`](src/app/workspace/page.tsx) & [`/tracker`](src/app/tracker/page.tsx) — 5-Stage Production Pipeline OS**:
  - Tracks runs from `01_brief` → `02_sampling` → `03_cutting` → `04_assembly` → `05_dispatch` with printable 80mm/A4 Factory Job Tickets & AQL 2.5 QC Passports ([`ProductionJobTicketModal.tsx`](src/app/components/ProductionJobTicketModal.tsx)), 30-day fabric burn-rate auto-POs, B2B CRM tiers, and CSV accounting export.

### 3. Design System, Motion & Mobile Responsiveness
- **Design Specification ([`DESIGN.md`](DESIGN.md))**: Structured following [Google `design.md`](https://github.com/google-labs-code/design.md) and [`nutlope/hallmark`](https://github.com/nutlope/hallmark) anti-slop principles — warm unbleached linen surfaces (`#f8f5f0`), deep olive ink (`#3d4f22`), editorial `Playfair Display` + `DM Sans` + tabular monospace numerals.
- **Interactive CAD Weave Canvas & Choreographed Motion**: [`AtelierWeaveCanvas.tsx`](src/app/components/AtelierWeaveCanvas.tsx) renders a 60fps DPI-scaled HTML5 2D warp-and-weft textile simulation with pointer parallax and `prefers-reduced-motion` static fallback, paired with GPU-composited Framer Motion transitions in [`AuthPortalClient.tsx`](src/app/components/AuthPortalClient.tsx) and [`AnimatedHero.tsx`](src/app/components/AnimatedHero.tsx).
- **Mobile & Container-Query Responsiveness**: Built with dynamic viewport units (`dvh` / `dvw`), `@container` responsive stacked data tables with sticky row/column headers, `16px` mobile form inputs (zero iOS auto-zoom), safe-area thumb-zone bottom navigation dock, and compact 2×2 mobile console module switchers.

---

## Tech Stack

- **Framework**: Next.js `16.4` (App Router, Turbopack, `src/proxy.ts` route protection) + React `19` + TypeScript `5`
- **Database & Hybrid Persistence**: Neon Serverless PostgreSQL (`@neondatabase/serverless`, schema in [`db/neon-schema.sql`](db/neon-schema.sql)) with automatic offline-safe local state fallback ([`src/app/lib/neon-clerk.ts`](src/app/lib/neon-clerk.ts))
- **Motion & Graphics**: `framer-motion`, HTML5 2D Canvas (`AtelierWeaveCanvas`), CSS Scroll-Driven Animations & Container Queries

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables (Optional for Local Mode)

Create `.env.local` in the project root if connecting to Neon Serverless Postgres and Clerk:

```bash
DATABASE_URL="postgresql://<user>:<password>@<neon-host>/<dbname>?sslmode=require"
AUTH_SESSION_SECRET="<32+-byte-random-hex-secret>"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="<optional-clerk-publishable-key>"
CLERK_SECRET_KEY="<optional-clerk-secret-key>"
```

> Without `DATABASE_URL`, the platform runs seamlessly in hybrid local persistence mode with all 3 Lagos plants, 11 staff/admin accounts, orders, and inventory pre-seeded.

### 3. Initialize Neon Database Schema (When `DATABASE_URL` Is Set)

```bash
npm run db:init
```

### 4. Start Development Server

```bash
npm run dev
```

Open `http://localhost:3000` to explore the public atelier, or visit `http://localhost:3000/login` to sign in to the Superadmin HQ (`/superadmin`), Plant Admin Console (`/dashboard`), or Factory Operations Workspace (`/workspace`).

---

## Project Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js development server |
| `npm run build` | Compile production bundle and type-check all routes |
| `npm run start` | Run compiled production server |
| `npm run db:init` | Provision/migrate Neon PostgreSQL tables from `db/neon-schema.sql` |
| `npm run lint` | Run ESLint across `src/` |
