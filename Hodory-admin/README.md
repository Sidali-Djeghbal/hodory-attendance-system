# Hodory Admin

[![Next.js](https://img.shields.io/badge/Next.js-16%2B-black?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19%2B-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)

Admin dashboard for managing student attendance and academic operations.

Live demo: https://hodory-admin.netlify.app/

> Note: This project is under development and not completed yet.

## Tech stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + shadcn/ui (Radix UI)
- Recharts (charts), KBar, Sonner (toasts)

## Features (current)

- Attendance monitoring dashboard (`/dashboard/overview`)
- CRUD-style admin screens:
  - Students (`/dashboard/students`) with CSV import/export helpers
  - Teachers (`/dashboard/teachers`)
  - Modules (`/dashboard/modules`)
  - Module assignments (`/dashboard/module-assignments`) + bulk assignment CSV
- Demo data persisted to browser `localStorage` (`hodory_admin_store_v5`)

## Getting started

### Prerequisites

- Node.js `22` (see `.nvmrc`)
- One of: Bun / npm / pnpm

### Install

```bash
# Bun
bun install

# or npm
npm install
```

### Run (dev)

```bash
bun run dev
# or: npm run dev
```

Then open `http://localhost:3000` (you’ll be redirected to `/auth/login`).


## Scripts

- `npm run dev` — start dev server
- `bun run dev` — start dev server (Bun)
- `npm run build` — production build
- `npm start` — run production server
- `npm run format` — format with Prettier
- `npm run format:check` — check formatting

## Data reset (demo store)

The admin data is stored in `localStorage`. To reset to seeded demo data, remove the key `hodory_admin_store_v5` in your browser storage (or clear site data).

## Project structure

- `src/app` — routes (auth, dashboard, API handlers)
- `src/components` — UI + layout components
- `src/features/admin` — demo admin domain (store, CSV helpers, catalog)
- `src/config` — app and navigation config
