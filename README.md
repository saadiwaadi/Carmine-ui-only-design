# Carmine Automotive Atelier

A full-stack site for Carmine: a public marketing/booking site backed by a real
database, plus an admin dashboard to manage services, work history, reservations,
and reviews.

## Stack

- **Backend:** Node.js + Express + Prisma ORM
- **Database:** PostgreSQL (works with any hosted Postgres — Neon, Supabase,
  Railway, Render, ElephantSQL, etc.)
- **Frontend:** Plain HTML/CSS/JS (no build step) served as static files by the
  same Express app
- **Auth:** JWT-based admin sessions (bcrypt-hashed password)

## Project layout

```
public/            The public site (index.html, images) + /admin dashboard
server/            Express API + Prisma schema/migrations
  prisma/schema.prisma   Data models
  prisma/seed.js         Seeds an admin account + starter content
  src/server.js          App entry point (serves API + static frontend)
  src/routes/            /api/services, /api/work, /api/reviews, /api/reservations, /api/auth, /api/upload
  uploads/                Uploaded images land here, served at /uploads/*
```

## 1. Get an online Postgres database

Create a free/managed Postgres instance with any provider you like (Neon,
Supabase, Railway, Render...). You'll end up with a connection string that
looks like:

```
postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
```

## 2. Configure environment variables

```bash
cd server
cp .env.example .env
```

Fill in `.env`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Your Postgres connection string |
| `JWT_SECRET` | Long random string used to sign admin sessions |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credentials for the first admin account (only used by the seed script) |
| `PORT` | Port the server listens on (default 4000) |
| `CORS_ORIGIN` | Comma-separated origins allowed to call the API |

Never commit `.env` — it's already git-ignored.

## 3. Install, migrate, seed

```bash
cd server
npm install
npx prisma migrate deploy   # creates tables in your database
npm run seed                # creates the admin account + starter services/work/reviews
```

## 4. Run it

```bash
npm start          # production
npm run dev         # auto-reload with nodemon
```

Visit:

- Public site: `http://localhost:4000/`
- Admin dashboard: `http://localhost:4000/admin/` (sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`)

## What's dynamic now

- **Services**, **The Work** dossiers, and **Reviews** are all fetched live
  from the database — no hardcoded placeholder content.
- **Reservations**: the booking flow checks real-time slot availability
  (`GET /api/reservations/availability?date=YYYY-MM-DD`) and books against the
  database, returning a real confirmation code.
- **Reviews**: visitors can submit a review from the public site; it's stored
  as unapproved until an admin approves it in the dashboard, at which point it
  appears publicly.
- **Admin dashboard** (`/admin`): add/edit/delete services and work items
  (with image upload or direct image URL), manage reservation status
  (pending/confirmed/completed/cancelled), and approve/edit/delete reviews.

## API summary

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | — | Admin login, returns JWT |
| GET | `/api/services` | — | List services |
| POST/PUT/DELETE | `/api/services[/:id]` | admin | Manage services |
| GET | `/api/work` | — | List work/dossier items |
| POST/PUT/DELETE | `/api/work[/:id]` | admin | Manage work items |
| GET | `/api/reviews` | — | List approved reviews |
| POST | `/api/reviews` | — | Submit a new review (pending approval) |
| GET | `/api/reviews/all` | admin | List all reviews, approved or not |
| PUT/DELETE | `/api/reviews/:id` | admin | Edit/approve/delete a review |
| GET | `/api/reservations/availability` | — | Slot availability for a date |
| POST | `/api/reservations` | — | Create a reservation |
| GET | `/api/reservations` | admin | List all reservations |
| PUT/DELETE | `/api/reservations/:id` | admin | Update status / delete |
| POST | `/api/upload` | admin | Upload an image, returns its URL |

## Deploying

Any Node host (Render, Railway, Fly.io, a VPS) works: set the environment
variables above, run `npx prisma migrate deploy && npm run seed` once, then
`npm start`. The Express app serves both the API and the static frontend, so
there's only one service to deploy.
