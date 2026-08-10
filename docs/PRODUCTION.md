# Ordani 2026 — Production runbook

**Status:** Static marketing + TinyMe film demo **shipped on GitHub Pages** · TinyMe API **deferred** (no Railway burn for demo)  
**Updated:** 2026-08-10

---

## What ships (public)

| Surface | Status | Notes |
|---------|--------|-------|
| Studio home `/` | Live | Products, GTA server card, team (Abel headshot fixed) |
| TinyMe `/tinyme` | Live | One Higgsfield film, autoplay, Make a link CTA |
| Onboarding `/onboarding` | Live | Create UI; offline → red demo interrupt |
| Console `/console` | Live | Operator shell; offline → same demo interrupt |
| Showcase `/showcase` | Live | Site-scroll GIFs |
| `/world` | Redirect | Sends home (no separate scroll-world product page) |
| TinyMe Go API | **Not on Pages** | Deliberate — demo does not burn Railway |

**Demo interrupt copy (create / offline):**  
`THIS WAS A DEMO TO SHOW AURA AND I DONT WANT TO WASTE MY RAILWAY BACKEND SPACE`

---

## Local

```bash
npm start
# http://localhost:4173/
# http://localhost:4173/tinyme
# http://localhost:4173/onboarding
# http://localhost:4173/showcase
# http://localhost:4173/console?skip=1

npm run check
npm run pages:build   # → dist/ with /ordani-2026 base
```

### Demo error check

1. Open `/onboarding` with API **down**
2. Create a link → red center interrupt with AURA / Railway line
3. **No** API base, key, or “Cannot reach the API” sheet

---

## Deploy (GitHub Pages)

- Workflow: `.github/workflows/pages.yml`
- Source: `public/` → `scripts/build-pages.mjs` → `dist/`
- Live: https://zwin-ux.github.io/ordani-2026/

Push to `main` deploys automatically.

---

## API (optional, later)

Only when ready to pay for always-on infra:

```bash
cd backend
# DATABASE_URL, API_KEY (required non-empty in prod), REDIRECT_BASE
psql $DATABASE_URL -f migrations/001_initial.sql
# + 002_auth.sql if using OAuth
go run ./cmd/server
```

Gates before calling private beta:

- [ ] Non-empty `API_KEY` in prod
- [ ] Ownership / multi-user
- [ ] Rate limits
- [ ] Real short domain DNS → API
- [ ] Fill `LOCKED_DOMAINS` in `domain-lock.js`

---

## Copy / design locks

See `docs/STOP-SLOP.md`:

- Little link. Big features.
- One film on `/tinyme` (no multi-plate carousel, no SIGNAL copy)
- No goat halt media
- No API console chrome on public onboarding

---

## Smoke (static)

```text
/ → 200
/tinyme → 200 + film
/onboarding → 200 + demo-error.js
/showcase → 200 + scroll GIFs
/console → 200
/assets/team/abel-hq.webp → 200 (face crop)
```
