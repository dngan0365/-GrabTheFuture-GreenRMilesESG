# GrabTheFuture - Green Mobility Incentive Platform

GrabTheFuture is a full-stack prototype for EV ride booking, commuting carbon analytics, employee green scoring, and Scope 3 ESG reporting. The platform helps companies compare electric and gasoline vehicle emissions before booking, calculate CO2 savings automatically, reward sustainable commuting, and track company-wide progress over time.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Setup Requirements](#setup-requirements)
- [Installation](#installation)
- [User Guide](#user-guide)
- [API Overview](#api-overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database](#database)
- [Environment Variables](#environment-variables)
- [Development Commands](#development-commands)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)

## Overview

This project is designed for companies that want to reduce employee commuting emissions and report Scope 3 carbon impact. Employees can book rides, compare EV and petrol emissions, earn green points, and redeem rewards. Company admins can view carbon dashboards, leaderboards, historical trends, month-end predictions, recommendations, and ESG report exports.

The backend owns all carbon calculations so the frontend does not need to be trusted for emission totals. The database stores rides, users, rewards, vehicle carbon factors, prediction logs, recommendation logs, and ESG reporting data.

## Features

- EV ride booking with carbon footprint estimation.
- Route distance calculation from origin and destination using Goong Maps API.
- CO2 comparison between electric and gasoline vehicles before booking.
- Automatic calculation of:
  - baseline CO2 emission
  - actual CO2 emission
  - CO2 saved
  - fuel saved
  - tree-equivalent impact
  - green score and green points
- Employee green leaderboard.
- Reward catalog and point-based redemption flow.
- Company-wide Scope 3 commuting analytics dashboard.
- Historical trends for carbon reduction progress.
- Month-end commuting emission prediction.
- AI/rule-powered recommendations to reduce commuting emissions.
- ESG and Scope 3 report endpoint with export-ready JSON.
- Docker Compose setup for frontend, backend, and PostgreSQL.

## Setup Requirements

Install these tools before running the project:

- Docker and Docker Compose
- Node.js 20+ if running the frontend outside Docker
- Python 3.11+ if running the backend outside Docker
- PostgreSQL client tools are optional but useful for debugging

Recommended ports:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

## Installation

### 1. Clone and enter the project

```bash
git clone <repository-url>
cd GrabTheFuture
```

### 2. Create `.env`

The repo currently expects a root `.env` file used by Docker Compose.

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/carbon_db
SECRET_KEY=change-me-in-production
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
AI_PROVIDER=MOCK
GOONG_API_KEY=
```

`GOONG_API_KEY` is required only when you want the backend to calculate route distance from origin and destination. If it is empty, distance-based booking still works when `distanceKm` is provided by the client.

### 3. Start all services with Docker

```bash
docker compose up -d --build
```

This starts:

- `carbon_postgres`
- `carbon_backend`
- `carbon_frontend`

### 4. Verify the database

```bash
docker exec -it carbon_postgres psql -U postgres -d carbon_db -c "\dt"
```

The SQL files in `db/` are mounted into PostgreSQL and run on first initialization.

### 5. Open the app

- Frontend: `http://localhost:3000`
- Backend health check: `http://localhost:8000/health`
- Swagger docs: `http://localhost:8000/docs`

## User Guide

### Employee workflow

1. Log in through the authentication API.
2. View available vehicle profiles.
3. Compare EV and petrol options for a trip distance.
4. Book a ride with origin, destination, purpose, vehicle profile, and either:
   - `distanceKm`, or
   - origin/destination only if `GOONG_API_KEY` is configured.
5. Complete the ride.
6. Earn green score and green points based on CO2 saved.
7. View ride history and carbon impact.
8. Redeem available rewards using green points.

### Company admin workflow

1. Log in as a company admin.
2. Review company carbon dashboard.
3. Track employee ranking on the green leaderboard.
4. Monitor historical emission and reduction trends.
5. Generate end-of-month commuting emission predictions.
6. Review recommendations for reducing emissions.
7. Export/report Scope 3 commuting analytics for ESG use.

## API Overview

Main API groups:

| Area | Endpoint | Purpose |
| --- | --- | --- |
| Health | `GET /health` | Service health check |
| Auth | `POST /api/auth/login` | User login |
| Auth | `GET /api/auth/me` | Current user profile |
| Metadata | `GET /api/meta` | Companies, users, vehicles, rewards |
| Carbon | `GET /api/carbon/vehicles` | Vehicle carbon profiles |
| Carbon | `POST /api/carbon/calculate` | Calculate carbon for one vehicle |
| Carbon | `POST /api/carbon/compare` | Compare vehicle options |
| Carbon | `POST /api/carbon/distance` | Get route distance from origin/destination |
| Rides | `POST /api/rides` | Book a ride |
| Rides | `GET /api/rides` | List ride history |
| Rides | `GET /api/rides/{ride_id}` | Get ride detail |
| Rides | `POST /api/rides/{ride_id}/complete` | Complete ride and issue points |
| Analytics | `GET /api/analytics/dashboard` | Scope 3 dashboard metrics |
| Analytics | `GET /api/analytics/leaderboard` | Employee green ranking |
| Analytics | `GET /api/analytics/trends` | Historical trends |
| Analytics | `POST /api/analytics/predictions/month-end` | Month-end prediction |
| Analytics | `POST /api/analytics/recommendations` | Emission reduction recommendations |
| Analytics | `GET /api/analytics/esg-report` | ESG Scope 3 report |
| Rewards | `GET /api/rewards` | Reward catalog |
| Rewards | `POST /api/rewards/redeem` | Redeem reward |

Example carbon comparison request:

```json
{
  "distanceKm": 12.5,
  "vehicleClass": "CAR_4"
}
```

Example ride booking request:

```json
{
  "originName": "District 1, Ho Chi Minh City",
  "destinationName": "District 7, Ho Chi Minh City",
  "distanceKm": 8.4,
  "vehicleProfileId": "CAR_4_ELECTRIC",
  "purpose": "COMMUTE",
  "estimatedDurationMinutes": 25,
  "priceVnd": 85000
}
```

## Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4

### Backend

- FastAPI
- SQLAlchemy 2 async ORM
- Pydantic v2
- asyncpg
- JWT authentication with `python-jose`
- Password hashing with Passlib/bcrypt
- HTTP integrations with `httpx`

### Database and Infrastructure

- PostgreSQL 16
- Docker Compose
- SQL seed/init scripts

### External APIs and AI

- Goong Maps API for geocoding and route distance.
- OpenAI/Anthropic keys are supported by configuration.
- Current recommendation logic can run in `MOCK` mode for demos.

## Architecture
![Architecture Image](./assets/img/architecture.png)
<!-- High-level flow: -->
<!-- 
```text
Frontend (Next.js)
    |
    | HTTP / JSON
    v
Backend API (FastAPI routers)
    |
    | Service layer
    v
Carbon, ride, reward, analytics, distance services
    |
    | SQLAlchemy async ORM
    v
PostgreSQL
``` -->

Backend structure:

- `backend/app/main.py` wires the FastAPI app and routers.
- `backend/app/api/` contains route modules grouped by domain.
- `backend/app/services/` contains business logic.
- `backend/app/models/` contains SQLAlchemy models.
- `backend/app/schemas/` contains Pydantic request/response schemas.
- `backend/app/core/` contains shared config, database, security, and carbon helpers.
- `backend/app/carbon.py` contains carbon constants and formulas.

## Database

Database initialization scripts live in `db/`:

- `01-extension.sql` enables required PostgreSQL extensions.
- `02-schema.sql` creates tables and indexes.
- `03-seed.sql` inserts fixed vehicle profiles and rewards.
- `04-demo-data.sql` inserts demo companies, users, departments, and rides.

Core tables:

- `companies`
- `departments`
- `users`
- `vehicle_profiles`
- `rides`
- `rewards`
- `reward_redemptions`
- `prediction_logs`
- `recommendation_logs`

If you change schema or seed files and want PostgreSQL to re-run them, reset the volume:

```bash
docker compose down -v
docker compose up -d --build
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL async connection string |
| `SECRET_KEY` | Yes | JWT signing secret |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Access token duration |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | Refresh token duration |
| `GOONG_API_KEY` | No | Enables route distance lookup |
| `AI_PROVIDER` | No | `MOCK`, `OPENAI`, or `CLAUDE` |
| `OPENAI_API_KEY` | No | OpenAI API key |
| `ANTHROPIC_API_KEY` | No | Anthropic API key |
| `DEBUG` | No | Enables SQLAlchemy echo when true |

## Development Commands

### Docker

```bash
docker compose up -d --build
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose down
```

### Backend without Docker

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

For PowerShell on Windows, use:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend without Docker

```bash
cd frontend
npm install
npm run dev
```

Useful frontend scripts:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Troubleshooting

### Database seed data did not update

PostgreSQL only runs files in `docker-entrypoint-initdb.d` when the database volume is empty. Reset the volume:

```bash
docker compose down -v
docker compose up -d --build
```

### Backend cannot connect to PostgreSQL

Check that `DATABASE_URL` uses the Docker service host when running inside Compose:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/carbon_db
```

If running backend locally outside Docker, use `localhost`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/carbon_db
```

### Distance API returns provider configuration error

Set `GOONG_API_KEY` in `.env`, then restart backend:

```bash
docker compose restart backend
```

### API documentation is not available

Make sure backend is running:

```bash
docker compose logs backend
```

Then open:

```text
http://localhost:8000/docs
```

## Project Structure

```text
GrabTheFuture/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── carbon.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── deps.py
│   │   ├── main.py
│   │   └── security.py
│   ├── Dockerfile
│   └── requirements.txt
├── db/
│   ├── 01-extension.sql
│   ├── 02-schema.sql
│   ├── 03-seed.sql
│   └── 04-demo-data.sql
├── frontend/
│   ├── app/
│   ├── public/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Notes

This repository is currently a hackathon/prototype-style codebase. The backend has the main business logic for carbon calculation and analytics, while the frontend is ready to be extended into the full product interface.
