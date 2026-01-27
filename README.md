<p align="center">
  <img src="public/banner.png" alt="Hodory banner" />
</p>

# Hodory Attendance System

<p align="center">
  <img src="public/logo-card.png" alt="Hodory logo" width="140" />
</p>

<p align="center">
  <img alt="Backend: FastAPI" src="https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white" />
  <img alt="Python" src="https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white" />
  <img alt="Database: PostgreSQL" src="https://img.shields.io/badge/DB-PostgreSQL-4169E1?logo=postgresql&logoColor=white" />
  <img alt="Mobile: Expo" src="https://img.shields.io/badge/Mobile-Expo-000020?logo=expo&logoColor=white" />
  <img alt="Mobile: React Native" src="https://img.shields.io/badge/Mobile-React%20Native-20232A?logo=react&logoColor=61DAFB" />
  <img alt="Web: Next.js" src="https://img.shields.io/badge/Web-Next.js-000000?logo=nextdotjs&logoColor=white" />
  <img alt="Desktop: Electron" src="https://img.shields.io/badge/Desktop-Electron-47848F?logo=electron&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5%2B-3178C6?logo=typescript&logoColor=white" />
</p>

Hodory is an attendance management system for educational institutions, with:
- a **FastAPI** backend (PostgreSQL + JWT auth)
- a **student mobile app** (Expo / React Native)
- **Admin & Teacher dashboards** (Next.js)
- **desktop apps** (Electron wrappers)

> Status: under development.

## System Architecture

<p align="center">
  <img src="public/system-architecture.png" alt="System architecture" />
</p>

## Screenshots

### Student (Mobile)
<p align="center">
  <img src="public/mobile-login.png" alt="Student login" width="24%" />
  <img src="public/mobile-home.png" alt="Student home" width="24%" />
  <img src="public/mobile-home-1.png" alt="Student home 2" width="24%" />
  <img src="public/mobile-home-2.png" alt="Student home 3" width="24%" />
</p>

<p align="center">
  <img src="public/justification1.png" alt="Justification flow 1" width="24%" />
  <img src="public/justification2.png" alt="Justification flow 2" width="24%" />
</p>

### Admin
![Hodory Admin screenshot](public/admin.png)

### Teacher
![Hodory Teacher screenshot](public/teacher.png)

## Repo Structure

- `backend/` — FastAPI API + DB models (SQLModel/SQLAlchemy)
- `frontend_mobile_app/` — Student mobile app (Expo Router)
- `frontend_desktop_apps/`
  - `Hodory-admin/` — Admin dashboard (Next.js)
  - `Hodory-teacher/` — Teacher dashboard (Next.js)
  - `Hodory-admin-electron/` — Admin desktop wrapper (Electron)
  - `Hodory-teacher-electron/` — Teacher desktop wrapper (Electron)

## Backend (FastAPI)

### Prerequisites
- Python 3.10+
- PostgreSQL

### Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.local.example .env.local
```

### Run
```bash
cd backend
python runserver.py
```

API docs:
- Swagger: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## Mobile App (Expo)

### Setup & run
```bash
cd frontend_mobile_app
bun install
bun start
```

Optional API override (useful on real devices):
- `EXPO_PUBLIC_API_URL=http://<your-lan-ip>:8000/api`

## Web Dashboards (Next.js)

### Admin
```bash
cd frontend_desktop_apps/Hodory-admin
bun install
bun run dev -- -p 3000
```

### Teacher
```bash
cd frontend_desktop_apps/Hodory-teacher
bun install
bun run dev -- -p 3001
```

Then open:
- Admin: `http://localhost:3000`
- Teacher: `http://localhost:3001`

## Desktop Apps (Electron)

### Teacher (Electron)
```bash
cd frontend_desktop_apps/Hodory-teacher-electron
npm install
npm run dev
```

### Admin (Electron)
```bash
cd frontend_desktop_apps/Hodory-admin-electron
npm install
npm run dev
```

## Contributors

<p align="center">
  <a href="https://github.com/3boudi">
    <img alt="3boudi" src="https://img.shields.io/badge/@3boudi-HALITIM%20amin-181717?logo=github&logoColor=white" />
  </a>
  <a href="https://github.com/nerddude9000">
    <img alt="nerddude9000" src="https://img.shields.io/badge/@nerddude9000-nerddude-181717?logo=github&logoColor=white" />
  </a>
  <a href="https://github.com/Sidali-Djeghbal">
    <img alt="Sidali-Djeghbal" src="https://img.shields.io/badge/@Sidali--Djeghbal-Sidali%20DJEGHBAL-181717?logo=github&logoColor=white" />
  </a>
</p>
