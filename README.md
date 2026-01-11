# Hodory Attendance System

[![Next.js](https://img.shields.io/badge/Next.js-16%2B-black?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19%2B-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/Bun-supported-000000?logo=bun&logoColor=white)](https://bun.sh/)
[![Code style: Prettier](https://img.shields.io/badge/code%20style-Prettier-ff69b4.svg)](https://prettier.io/)
[![Monorepo](https://img.shields.io/badge/monorepo-Hodory-blue)](#repo-structure)

Hodory is an attendance management system for optimizing attendance tracking and management in educational institutions.

> Status: under development (not finished yet).

## Live previews

- Admin app: https://hodory-admin.netlify.app/
- Teacher app: https://hodory-teacher.netlify.app/

## Screenshots

| Admin | Teacher |
| --- | --- |
| ![Hodory Admin screenshot](public/admin.png) | ![Hodory Teacher screenshot](public/teacher.png) |

## Repo structure

- `Hodory-admin/` — Admin frontend
- `Hodory-teacher/` — Teacher frontend

Each app is a standalone Next.js project with its own `package.json`.

## Features (current / planned)

- Admin dashboard
  - Attendance monitoring dashboard
  - Manage students / teachers / modules
  - Module assignment flows + CSV helpers (import/export)
- Teacher dashboard
  - Start / manage attendance sessions
  - Track presence for a session
  - Absence / justification review workflow (evolving)

## Tech stack

- Frontend: Next.js (App Router), React, TypeScript
- UI: Tailwind CSS, shadcn/ui (Radix UI)
- Tooling: Prettier, Bun (optional)
- Notable libraries used in the apps: next-themes, nuqs, Sentry, Recharts, KBar, Sonner

## Development

Prerequisites:
- Node.js `22` or higher
- package manager: Bun / npm / pnpm

Run Admin:
```bash
cd Hodory-admin
bun install
bun run dev -- -p 3000
```

Run Teacher:
```bash
cd Hodory-teacher
bun install
bun run dev -- -p 3001
```

Then open:
- Admin: http://localhost:3000
- Teacher: http://localhost:3001
