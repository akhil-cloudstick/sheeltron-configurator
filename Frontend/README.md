# Sheeltron Configurator — Admin Portal (Frontend)

React + Vite + TypeScript + Tailwind admin portal for the Sheeltron Configurator.

## What this is

The **Admin Portal** of the Sheeltron Configurator. It has three modules:

- **Stock** — physical inventory. _Servers_ are wired to the live Go backend
  (`/api/stock/servers`). _CPUs / RAM / Storage / Network_ run on mock data until
  their backends exist.
- **Catalog** — priced SKU definitions (`price_new` / `price_refurb`, specs). Mock data.
- **Pricing & Rules** — bulk price update + compatibility overrides. Mock data.

### Roles (mocked auth)

| Role | Sees |
|---|---|
| `admin` | Stock + Catalog + Pricing & Rules |
| `stock_manager` | Stock only (Catalog & Pricing hidden + route-guarded) |

> Auth is **mocked** — there is no real auth backend yet. The login screen accepts
> any non-empty credentials and a chosen role, or use the demo buttons.

## Prerequisites

- Node 18+ and npm
- The Go backend running on `http://localhost:8080` (for the real Servers stock module)

## Setup

```bash
cp .env.example .env       # adjust VITE_API_BASE_URL if the backend isn't on :8080
npm install
npm run dev                # http://localhost:5173
```

Start the backend separately:

```bash
cd ../Backend
go run main.go             # needs Postgres up; serves http://localhost:8080
```

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — type-check + production build
- `npm run preview` — preview the production build
- `npm run typecheck` — TypeScript only

## Design system

Tokens follow `../../docs/04_VISUAL_DESIGN.md` (brand red `#e53935`, Space Grotesk +
Plus Jakarta Sans, density-first, light theme). Tokens are CSS variables in
`src/index.css`; Tailwind maps semantic names to them, so a dark theme can be added
later by overriding `[data-theme='dark']` only.

The logo PNG is not yet in the repo, so a text wordmark placeholder is used.

## Mock data

`src/mock/seed.ts` seeds an in-memory store (`src/store/mockDbStore.ts`) persisted to
`localStorage`. Use **Reset demo data** (top bar menu) to restore the seed.
