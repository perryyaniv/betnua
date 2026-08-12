# בתנועה — Betnua Studio Manager

Internal Hebrew RTL PWA for managing a 3-branch dance studio: branches, teachers, weekly course schedules, and events that need advance preparation (with push-alert reminders). Full design decisions and data model live in [BETNUA_PLAN.md](BETNUA_PLAN.md).

## Stack
- **Backend**: Node/Express + TypeScript, MongoDB via Mongoose, JWT auth, Socket.IO, `node-cron` + `web-push` for alerts.
- **Frontend**: React + Vite + TypeScript + Tailwind, i18next (Hebrew-only, RTL), installable PWA (`vite-plugin-pwa`).

## Prerequisites
- Node.js 20+
- A MongoDB instance (local `mongod` or MongoDB Atlas)

## Setup

```bash
# Backend
cd backend
cp .env.example .env      # fill in MONGODB_URI, JWT_SECRET
npm install
npx web-push generate-vapid-keys   # paste the two keys into .env to enable push notifications
npm run seed                       # creates the 3 branches, course types, a season, and an admin user
npm run dev                        # http://localhost:5000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

Default seeded login: **admin / admin** — no forced password change. Change this before relying on it for anything beyond local testing (see Known limitations).

### No MongoDB handy? Run against an ephemeral in-memory DB

```bash
cd backend
npm run demo:db &            # prints a MONGODB_URI, keeps running until stopped
MONGODB_URI=mongodb://127.0.0.1:27117/betnua npm run seed
MONGODB_URI=mongodb://127.0.0.1:27117/betnua npm run seed:demo   # adds sample teachers/courses/events
MONGODB_URI=mongodb://127.0.0.1:27117/betnua npm run dev
```

Data disappears once `demo:db` is stopped — for anything real, use `.env`'s `MONGODB_URI` against a persistent instance instead.

## Tests

```bash
cd backend
npm test
```

Covers the pure logic that's easy to get subtly wrong: alert-threshold timing, room-conflict detection, branch-access rules, and the teacher hours report — not an exhaustive UI test suite (see BETNUA_PLAN.md's testing notes).

## Known limitations to revisit
- **The default admin login is `admin`/`admin` with no forced change** — a deliberate simplification during setup, but this app is reachable on the public internet once deployed. Change it (via the app's own change-password flow, or `backend/scripts/set-admin-password.ts`) before depending on this for real operational data.
- The PWA icon (`frontend/public/logo.png`) is the current live-site logo at 233×170 — usable for the header/login screen, but not square, so it won't look ideal as a home-screen icon. Swap in a proper square icon (e.g. 512×512) when a better logo asset is available.
- Push notifications require `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` in the backend `.env`; without them the app runs fine but silently skips sending pushes.
- iOS only delivers web push to an installed (home-screen) PWA — the in-app install prompt (`InstallPrompt.tsx`) nudges users toward that, but there's no way to force it.
