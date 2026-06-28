# 🌱 GrabTheFuture — Green Mobility Incentive Platform

Full-stack platform that turns every employee ride into measurable Scope 3 reduction data. Employees compare EV vs petrol before booking, earn green points, and redeem rewards; admins track company-wide carbon, leaderboards, ML forecasts, and ESG reports.

The backend owns all carbon math — the frontend never computes emissions.

## Features

- EV vs petrol CO₂ comparison before booking, with backend-owned math.
- Origin → destination distance + route via Goong Maps (with address autocomplete).
- Auto-calculated baseline/actual CO₂, CO₂ saved, fuel saved, tree-equivalent, green points/score.
- Employee dashboard, green leaderboard, ride history, and reward redemption.
- Company Scope 3 dashboard, per-department breakdown, and historical trends.
- 📈 ML month-end emission forecast (linear regression on daily ride data).
- Data-driven recommendations (rule/AI, with a `MOCK` provider for offline demos).
- ESG Scope 3 report with export-ready JSON.

## 🚀 Quick Start

Requires Docker + Docker Compose. (Outside Docker: Node 20+ and Python 3.11+.)

```bash
# 1. create the root .env (backend config)
cat > .env <<'EOF'
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/carbon_db
SECRET_KEY=change-me-in-production
AI_PROVIDER=MOCK
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOONG_API_KEY=
EOF

# 2. start everything
docker compose up -d --build
```

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:3000` |
| Backend | `http://localhost:8000` |
| API docs | `http://localhost:8000/docs` |
| Postgres | `localhost:5432` |

The SQL files in `db/` seed the database on first init (companies, users, vehicles, rewards, demo rides).

### 🔑 Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Employee | `tam@greencorp.vn` | `password123` |
| Company Admin | `admin@greencorp.vn` | `password123` |

## Environment Variables

Backend (`./.env`):

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL async connection string |
| `SECRET_KEY` | Yes | JWT signing secret |
| `GOONG_API_KEY` | No | Enables distance + place autocomplete (REST key) |
| `AI_PROVIDER` | No | `MOCK`, `OPENAI`, or `CLAUDE` |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | No | LLM keys when not using `MOCK` |
| `DEBUG` | No | SQLAlchemy echo |

Frontend (`frontend/.env.local`):

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Backend base, default `http://localhost:8000/api/v1` |
| `NEXT_PUBLIC_USE_MOCK` | `true` to run UI on in-memory mock data |
| `NEXT_PUBLIC_GOONG_MAPTILES_KEY` | Goong **Maptiles** key for the route map (≠ `GOONG_API_KEY`) |

## API Overview

Base path: `/api/v1`.

| Area | Endpoint | Purpose |
| --- | --- | --- |
| Auth | `POST /auth/login`, `GET /auth/me` | Login, current user |
| Carbon | `POST /carbon/calculate`, `/carbon/compare` | Carbon for one / all vehicles |
| Carbon | `POST /carbon/distance` | Route distance (Goong) |
| Carbon | `GET /carbon/places/autocomplete` | Address autocomplete (Goong) |
| Carbon | `GET /carbon/vehicles` | Vehicle carbon profiles |
| Rides | `POST/GET /rides`, `/rides/{id}`, `/rides/{id}/complete` | Book, list, detail, complete |
| Analytics | `GET /analytics/dashboard`, `/leaderboard`, `/trends`, `/by-department` | Company metrics |
| Analytics | `POST /analytics/predictions/month-end` | ML month-end forecast |
| Analytics | `POST /analytics/recommendations` | Reduction recommendations |
| Analytics | `GET /analytics/esg-report` | Scope 3 report |
| Rewards | `GET /rewards`, `POST /rewards/redeem` | Catalog, redeem |

## Tech Stack

- **Frontend** — Next.js 16, React 19, TypeScript, Tailwind 4, Recharts, Goong JS.
- **Backend** — FastAPI, SQLAlchemy 2 (async), Pydantic v2, asyncpg, JWT, NumPy (regression).
- **Infra** — PostgreSQL 16, Docker Compose, Goong Maps, optional OpenAI/Anthropic.

## Architecture

![Architecture Image](./assets/img/architecture.png)
<!-- High-level flow: -->
<!-- 
```text
Next.js (typed service layer: mock ⇄ live API)
   │  HTTP / JSON
Backend API (FastAPI routers)
   │  service layer  →  carbon · rides · analytics · distance · prediction
SQLAlchemy async ORM
   │
PostgreSQL
``` -->

All dashboards, leaderboards, ESG, and analytics are derived from the `rides` table — no separate aggregate tables.

## Project Structure

```text
.
├── backend/app/        # api/ · services/ · models/ · schemas/ · core/ · carbon.py
├── frontend/           # app/ (routes) · components/ · lib/services/ (mock + api)
├── db/                 # 01-extension · 02-schema · 03-seed · 04-demo-data
├── docker-compose.yml
└── .env                # backend config
```

## Troubleshooting

- **Seed data didn't update** — Postgres only seeds an empty volume: `docker compose down -v && docker compose up -d --build`.
- **Distance/autocomplete fails** — set `GOONG_API_KEY`, then `docker compose restart backend`.
- **Map tiles blank** — set `NEXT_PUBLIC_GOONG_MAPTILES_KEY` in `frontend/.env.local`, then rebuild the frontend.
- **Frontend missing deps in Docker** — refresh the anonymous volume: `docker compose up -d --build --renew-anon-volumes frontend`.
