# TinyMe Backend

Go + Fiber backend for TinyMe link operations. Deployed on Railway with PostgreSQL.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Railway                        │
│  ┌─────────────┐  ┌──────────────────────────┐  │
│  │   Fiber     │  │     PostgreSQL           │  │
│  │   :8080     │◄─┤     (managed)            │  │
│  └──────┬──────┘  └──────────────────────────┘  │
│         │                                        │
│  ┌──────▼──────┐                                │
│  │  Redirect   │  Fast path: slug → destination │
│  │  Service    │  with routing rules            │
│  └──────┬──────┘                                │
│         │                                        │
│  ┌──────▼──────┐                                │
│  │  Analytics  │  Async event recording         │
│  │  Service    │  (fire-and-forget)             │
│  └─────────────┘                                │
└─────────────────────────────────────────────────┘
```

## Data Model

```
Link ─┬─ Destination (1+) ── DestinationHistory (0+)
      │
      └─ RoutingRule (0+) ── Destination (reference)

Event (per click, linked to Link + Destination)
```

## API Endpoints

### Management (API key required)

| Method | Path | Description |
|--------|------|-------------|
| POST   | /api/links | Create link |
| GET    | /api/links | List links |
| GET    | /api/links/:id | Get link with destinations and rules |
| PATCH  | /api/links/:id | Update link settings |
| DELETE | /api/links/:id | Soft-delete link |
| POST   | /api/links/:id/destinations | Add destination |
| PATCH  | /api/links/:id/destinations/:destId | Update destination |
| POST   | /api/links/:id/destinations/:destId/rollback | Rollback to previous URL |
| GET    | /api/links/:id/destinations/:destId/history | Destination change history |
| POST   | /api/links/:id/rules | Add routing rule |
| DELETE | /api/links/:id/rules/:ruleId | Delete routing rule |
| GET    | /api/links/:id/analytics | Analytics summary |
| GET    | /api/links/:id/events | Raw events |

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET    | /:slug | Redirect (resolves destination via routing rules) |
| GET    | /health | Health check |

## Routing Rules

Rules are evaluated in priority order (lower = higher priority). First match wins.

```json
{
  "type": "country",
  "condition": {"countries": ["US", "CA"]},
  "destination_id": "dest-123",
  "priority": 10
}
```

Supported types:
- `country` — ISO 3166-1 alpha-2 codes
- `device` — `mobile`, `desktop`, `tablet`
- `referrer` — substring match on referrer URL
- `schedule` — UTC hours (0-23)

## Local Development

```bash
# Start PostgreSQL (Docker)
docker run -d --name tinyme-pg -p 5432:5432 -e POSTGRES_DB=tinyme -e POSTGRES_PASSWORD=dev postgres:16

# Set env vars
export DATABASE_URL="postgres://postgres:dev@localhost:5432/tinyme?sslmode=disable"

# Run migrations
psql $DATABASE_URL -f migrations/001_initial.sql

# Start server
go run ./cmd/server
```

## Railway Deployment

1. Connect GitHub repo
2. Railway auto-detects Dockerfile
3. Add PostgreSQL service ( Railway provisions DATABASE_URL)
4. Set environment variables:
   - `API_KEY` — your management API key
   - `BASE_URL` — your production URL
   - `REDIRECT_BASE` — your short link domain
5. Deploy

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 8080 | Server port (Railway sets this) |
| DATABASE_URL | Yes | — | PostgreSQL connection string |
| API_KEY | No | (empty) | API key for management endpoints |
| BASE_URL | No | http://localhost:8080 | Public base URL |
| REDIRECT_BASE | No | tinyme.cc | Default domain for short links |
