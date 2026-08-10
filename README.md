# Ordani Studios + TinyMe

Product studio site and link operations backend.

## What's Here

```
├── public/              Frontend (static HTML/CSS/JS)
│   ├── index.html       Ordani Studios homepage
│   ├── tinyme.html      TinyMe product page
│   ├── styles.css       Design system
│   └── app.js           Interactive behavior
│
├── backend/             Go + Fiber API server
│   ├── cmd/server/      Entry point
│   ├── internal/        Services, handlers, models
│   ├── migrations/      PostgreSQL schema
│   └── Dockerfile       Railway deploy
│
├── data/                Content data (JSON)
├── scripts/             Dev server, validation
└── resources/           Laravel Blade templates (future)
```

## Quick Start

**Frontend** (no install required):

```bash
npm start
# → http://localhost:4173/
# → http://localhost:4173/world
# → http://localhost:4173/tinyme
npm run check
```

Production notes: `docs/PRODUCTION.md` · Scroll world bible: `docs/SCROLL-WORLD-SHOT-BIBLE.md`

## GitHub Pages (static demo)

Screenshots, gifs, marketing UI, onboarding/console shells, domain STOP halt.

```bash
npm run pages:build     # → dist/ with /ordani-2026 base path
npm run pages:preview   # build + serve dist locally
```

- Live (after first Actions deploy): https://zwin-ux.github.io/ordani-2026/
- Showcase gallery: `/showcase` — drop media in `public/assets/showcase/` + edit `manifest.json`
- Setup: **Settings → Pages → Source: GitHub Actions** (workflow: `.github/workflows/pages.yml`)
- Full guide: `docs/GITHUB-PAGES.md`

**Not on Pages:** live short-link API / Postgres. Create → SYSTEM HALT until domain is locked.

**Backend** (requires Go + PostgreSQL):

```bash
cd backend
docker run -d --name tinyme-pg -p 5432:5432 -e POSTGRES_DB=tinyme -e POSTGRES_PASSWORD=dev postgres:16
export DATABASE_URL="postgres://postgres:dev@localhost:5432/tinyme?sslmode=disable"
psql $DATABASE_URL -f migrations/001_initial.sql
go run ./cmd/server
# → http://localhost:8080
```

## Deploy to Railway

1. Push to GitHub
2. Create Railway project → "Deploy from GitHub"
3. Add PostgreSQL service
4. Set `API_KEY`, `BASE_URL`, `REDIRECT_BASE`
5. Run migration: `railway run psql $DATABASE_URL -f migrations/001_initial.sql`

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/links` | Create short link |
| `GET` | `/api/links` | List all links |
| `GET` | `/api/links/:id` | Get link + destinations + rules |
| `PATCH` | `/api/links/:id` | Update link settings |
| `DELETE` | `/api/links/:id` | Soft-delete link |
| `POST` | `/api/links/:id/destinations` | Add destination |
| `PATCH` | `/api/links/:id/destinations/:destId` | Update destination |
| `POST` | `/api/links/:id/destinations/:destId/rollback` | Rollback URL |
| `POST` | `/api/links/:id/rules` | Add routing rule |
| `DELETE` | `/api/links/:id/rules/:ruleId` | Delete routing rule |
| `GET` | `/api/links/:id/analytics` | Analytics summary |
| `GET` | `/api/links/:id/events` | Raw click events |
| `GET` | `/:slug` | **Redirect** (public) |

All `/api/*` endpoints require `Authorization: Bearer <API_KEY>`.

## Design System

- **Typography**: Space Grotesk + Inter + JetBrains Mono
- **Palette**: Carbon, Paper, Gold, Orange, Green, Red
- **Spacing**: 8px base, 9-step scale
- **Motion**: Respects `prefers-reduced-motion`

## License

Private — Ordani Studios 2026
