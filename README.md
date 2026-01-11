# Hodory Attendance System

[![Next.js](https://img.shields.io/badge/Next.js-16%2B-black?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19%2B-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/Bun-supported-000000?logo=bun&logoColor=white)](https://bun.sh/)
[![Code style: Prettier](https://img.shields.io/badge/code%20style-Prettier-ff69b4.svg)](https://prettier.io/)
[![Monorepo](https://img.shields.io/badge/monorepo-Hodory-blue)](#repo-structure)

Hodory is an attendance management system with two web apps: an Admin dashboard and a Teacher app.

> Status: under development (not finished yet).

## Live previews

- Admin app: https://hodory-admin.netlify.app/
- Teacher app: https://hodory-teacher.netlify.app/

## Repo structure

- `Hodory-admin/` — admin dashboard app (Next.js)
- `Hodory-teacher/` — teacher-facing app (Next.js)

Each app is a standalone Next.js project with its own `package.json`.

## What’s inside

- Admin: manage students/teachers/modules and monitor attendance (demo/seeded data in the current UI).
- Teacher: start attendance sessions, track presence, and handle absence/justifications (workflow evolving).

## Development

Prerequisites:
- Node.js `22` (see each app’s `.nvmrc`)
- One package manager: Bun / npm / pnpm

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
