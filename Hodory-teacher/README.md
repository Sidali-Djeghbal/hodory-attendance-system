# Hodory Teacher

[![Next.js](https://img.shields.io/badge/Next.js-16%2B-black?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19%2B-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)

Teacher-facing app for running attendance sessions, tracking presence, and managing absence justifications.

> Note: This project is under development and not completed yet.

live demo: https://hodory-teacher.netlify.app/

## What it’s for

- Start / end attendance sessions for assigned modules
- View live attendance progress (present vs. expected)
- Review absences and submit/approve justifications (workflow TBD)
- Track historical sessions and analytics (planned)

## Tech stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + shadcn/ui (Radix UI)

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


## Scripts

- `npm run dev` — start dev server
- `bun run dev` — start dev server (Bun)
- `npm run build` — production build
- `npm start` — run production server
- `npm run format` — format with Prettier
- `npm run format:check` — check formatting

