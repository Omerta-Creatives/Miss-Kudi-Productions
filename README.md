# Miss Kudi Productions — B2B Garment Manufacturing & Factory Operations OS

End-to-end **B2B Apparel Manufacturing Atelier** and **Factory Operations OS** built for **Miss Kudi Productions** at **1 Alawode Street, Surulere, Lagos, Nigeria**:
- **Division 01 — Surulere Cut-and-Sew Production Floor** (High-volume cut-and-sew, knitwear, streetwear, and structured tailoring lines)
- **Division 02 — CAD Pattern, Grading & Sample Atelier** (CAD pattern drafting, first-fit samples, luxury resortwear, and XS–XXL grading)
- **Division 03 — Quality Assurance & Export Finishing Bay** (36-point AQL 2.5 inspection, vacuum steam pressing, private-label tagging, and dispatch)

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

### 1. Authentication, Sessions, Sign-Out & Rate Limiting
- **Cryptographic Password Hashing (`PBKDF2-SHA256`)**: Implemented in [`src/app/lib/auth-server.ts`](src/app/lib/auth-server.ts) using Web/Node `crypto` (`120,000` iterations, random 128-bit salt, timing-safe `timingSafeEqual` verification) with brute-force lockout protection.
- **Signed Session Cookies & Sign-Out**: Issues `HttpOnly`, `SameSite=Lax` HMAC-SHA256 cookies (`__Host-mkp_session` over HTTPS, `mkp_session` on localhost) supporting **30-day trusted workstation persistence (`Remember Me`)** or **8-hour floor shift expiration**, with one-click Sign Out in the header, console sidebars, and mobile navigation.
- **Sliding-Window Rate Limiting**: [`src/app/lib/rate-limit.ts`](src/app/lib/rate-limit.ts) and [`src/proxy.ts`](src/proxy.ts) enforce per-IP and composite per-account sliding-window limits across authentication, recovery, quote inquiries, and admin endpoints with `429 Too Many Requests`, `Retry-After`, and `X-RateLimit-*` headers.
- **6-Digit OTP Password Reset (`/reset-password`)**: Anti-enumeration challenge flow issuing sealed OTP tokens with **WebOTP / SMS autofill (`autocomplete="one-time-code"`)** and automatic post-reset sign-in.

### 2. Three-Tier Role-Based Access Control (`superadmin`, `admin`, `staff`)
- **[`/superadmin`](src/app/superadmin/page.tsx) — Superadmin Executive HQ**:
  - Consolidated multi-plant revenue, COGS, OpEx, and capacity snapshots across Yaba, Victoria Island, and Ikeja.
  - Dedicated views for authorized team & access management, facility provisioning, and searchable security/audit logs.
- **[`/dashboard`](src/app/dashboard/page.tsx) — Role-Adaptive Plant Console & Floor Station**:
  - **Plant Admin (`admin` / `superadmin`)**: Calm executive plant overview with recent orders, stock health alerts, shift status, and dedicated full-width modules for Production Orders, Team Roster, and Materials & Stock.
  - **Floor Specialist (`staff`)**: Role-tailored workstation for **Pattern Designers**, **Cutting Masters**, **Master Tailors**, and **Quality Control (QC) Inspectors** with shift clock toggles and one-tap batch logging.
- **[`/workspace`](src/app/workspace/page.tsx) & [`/tracker`](src/app/tracker/page.tsx) — 5-Stage Production Pipeline OS**:
  - Tracks runs from brief to dispatch with printable 80mm/A4 Factory Job Tickets & AQL 2.5 QC Passports ([`ProductionJobTicketModal.tsx`](src/app/components/ProductionJobTicketModal.tsx)), 30-day fabric burn-rate auto-POs, B2B CRM tiers, and CSV accounting export.

### 3. Design System, Motion & Mobile Responsiveness
- **Design Specification ([`DESIGN.md`](DESIGN.md))**: Warm unbleached linen surfaces (`#f8f5f0`), deep olive ink (`#3d4f22`), editorial `Playfair Display` + `DM Sans` + tabular monospace numerals.
- **Choreographed Motion & 3D Journey Slider**: [`AnimatedHero.tsx`](src/app/components/AnimatedHero.tsx) renders a 6-chapter fullscreen production journey with CSS Scroll-Driven Animations and `prefers-reduced-motion` support.
- **Mobile & Container-Query Responsiveness**: Built with dynamic viewport units (`dvh` / `dvw`), `@container` responsive stacked data tables with sticky headers, `16px` mobile form inputs, and safe-area thumb-zone bottom navigation.

---

## Tech Stack

- **Framework**: Next.js `16.4` (App Router, Turbopack, `src/proxy.ts` route protection & API rate limiting) + React `19` + TypeScript `5`
- **Database & Hybrid Persistence**: PostgreSQL (`DATABASE_URL` / `POSTGRES_URL`, schema in [`db/schema.sql`](db/schema.sql)) with automatic offline-safe local state fallback ([`src/app/lib/database.ts`](src/app/lib/database.ts))
- **Motion & Graphics**: `framer-motion`, HTML5 2D Canvas (`AtelierWeaveCanvas`), CSS Scroll-Driven Animations & Container Queries

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables (Optional for Local Mode)

Create `.env.local` in the project root if connecting to PostgreSQL:

```bash
DATABASE_URL="postgresql://<user>:<password>@<postgres-host>/<dbname>?sslmode=require"
AUTH_SESSION_SECRET="<32+-byte-random-hex-secret>"
```

> Without `DATABASE_URL`, the platform runs seamlessly in hybrid local persistence mode across all 3 Lagos plants.

### 3. Initialize PostgreSQL Schema (When `DATABASE_URL` Is Set)

```bash
npm run db:init
```

### 4. Start Development Server

```bash
npm run dev
```

Open `http://localhost:3000` to explore the public atelier, or visit `http://localhost:3000/login` to sign in to the Superadmin HQ (`/superadmin`), Plant Console (`/dashboard`), or Factory Operations Workspace (`/workspace`).

---

## Project Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js development server |
| `npm run build` | Compile production bundle and type-check all routes |
| `npm run start` | Run compiled production server |
| `npm run db:init` | Provision/migrate PostgreSQL tables from `db/schema.sql` |
| `npm run lint` | Run ESLint across `src/` |
