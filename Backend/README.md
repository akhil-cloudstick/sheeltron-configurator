# Sheeltron Configurator — Backend (Server Stock)

Go + Echo + GORM backend for managing physical server **stock** (serial-numbered
units). Supports one-by-one CRUD and bulk Excel/CSV import (upsert by serial no).

## Prerequisites

- **Go 1.22+**
- **PostgreSQL** running locally (for now). Later this moves to a shared Docker
  Postgres — see [`docker-compose.yml`](./docker-compose.yml). The only thing
  that changes is `DB_HOST` in `.env`; no code changes.

## Setup

1. Create the database (one-time):
   ```sql
   CREATE USER configurator WITH PASSWORD 'configurator' SUPERUSER;
   CREATE DATABASE "configurator";
   GRANT ALL PRIVILEGES ON DATABASE configurator TO configurator;
   ```
2. Configure `.env` (a working local default is already committed):
   ```
   APP_PORT=8080
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=configurator
   DB_PASSWORD=configurator
   DB_NAME=configurator
   DB_SSLMODE=disable
   ```
3. Fetch dependencies and run (from the `Backend/` directory):
   ```powershell
   cd Backend
   go mod tidy
   go run main.go
   ```
   On boot, `InitDB()` connects and runs the SQL migrations in `migrations/`
   (idempotent via sql-migrate's `gorp_migrations` table). You should see
   `applied 1 migration(s)`.

## Switching to the shared Docker DB (later)

```powershell
docker compose up -d db          # run once on the shared host (e.g. ZAISERVER)
# then in every dev's .env:
# DB_HOST=ZAISERVER   (or the host IP)
```

## API

Full endpoint reference, the `ServerUnit` schema, status values, and request/response
examples live in **[docs/documentation.md](../docs/documentation.md)**.

Quick overview: server-stock CRUD + bulk Excel/CSV import under `/api/stock/servers`.
Responses use `{ "success": bool, ... }`; errors return
`{ "success": false, "error": "..." }` with `400` (general) or `404` (missing) — never `500`.

## Layout

```
main.go                              entrypoint: config.InitDB() → echo.New() → routers.InitRoutes(e) → Start
config/database.go                   InitDB(): load .env, GORM connect + sql-migrate up; exposes config.DB
routers/routers.go                   InitRoutes(e): global middleware + /health + register every module
migrations/                          sql-migrate SQL files (schema source of truth)
modules/
  stock/                             stock domain — one file per stock type
    models/servers.go                ServerUnit struct + status constants + upsert columns
    controllers/servers.go           CRUD + bulk import + server-sheet parsing
    routers/servers.go               RegisterServerRoutes → /api/stock/servers
```

Adding a new stock type later (e.g. CPUs) means dropping `cpus.go` into each of
`modules/stock/{models,controllers,routers}` and registering it in `main.go` —
no shared `utils`, each type owns its own parsing.
