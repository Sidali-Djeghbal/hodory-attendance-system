# Hodory Attendance System

Monorepo containing the Hodory attendance apps.

## Live previews

- Admin app: https://hodory-admin.netlify.app/
- Teacher app: https://hodory-teacher.netlify.app/

## Repo structure

- `Hodory-admin/` — admin dashboard app (Next.js)
- `Hodory-teacher/` — teacher-facing app (Next.js)

Each app is a standalone Next.js project with its own `package.json`.

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

