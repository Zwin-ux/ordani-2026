# TinyMe feature checklist

**Question:** Does every Tiny feature work?  
**Answer:** **No — not in the UI.** The **core control loop works** end-to-end (API + redirect + analytics). Console is a thin operator surface. Marketing demo panels on `/tinyme` are **sample data**, not live product.

**Last verified:** 2026-08-09 (local stack)  
**Stack at verify:** Docker `tinyme-pg` up · API `:8080` · site `:4173` · Bearer `dev-local-key`  

**Console UI update (same day):** soft-delete, destination history + rollback, analytics strip (total / human / bot) shipped in `/console`.

| Status | Meaning |
|--------|---------|
| **PASS** | Probed live today; works |
| **BUILT** | Code exists; not fully UI-exposed |
| **API-ONLY** | REST works; no console control |
| **PARTIAL** | Schema/handler incomplete or windowed |
| **DEFERRED** | Intentional later / out of private-beta v1 |
| **OUT** | Marketing direction only |
| **SAMPLE** | UI shows fake data (labeled) |

Smokes used: `scripts/smoke-tinyme.ps1`, `scripts/smoke-onboarding.ps1`, extended REST probe.

---

## A. Infrastructure

| # | Feature | Surface | Status | Evidence |
|---|---------|---------|--------|----------|
| A1 | Health check | `GET /health` | **PASS** | Smoke + probe |
| A2 | Postgres persistence | Docker / `DATABASE_URL` | **PASS** | Create survives list/get |
| A3 | CORS for site→API | Middleware | **PASS** | Onboarding + console create |
| A4 | Request ID / recover / logger | Fiber middleware | **BUILT** | Always on |
| A5 | Fail-closed API auth | Empty key → 401 | **PASS** | Probe without Bearer → 401 |
| A6 | Bearer API key manage auth | `Authorization: Bearer` | **PASS** | All `/api/*` with `dev-local-key` |
| A7 | Site static server | `node scripts/server.mjs` :4173 | **PASS** | `/`, `/tinyme`, `/onboarding`, `/console`, `/world` → 200 |
| A8 | Railway deploy surface | Dockerfile + railway.toml | **BUILT** | Not re-verified prod this run |

---

## B. Auth & sessions

| # | Feature | Surface | Status | Evidence |
|---|---------|---------|--------|----------|
| B1 | Auth status | `GET /auth/status` | **PASS** | `google_enabled=false` locally |
| B2 | Google OAuth start | `GET /auth/google` | **DEFERRED** | Built; needs Google env + enabled |
| B3 | Google OAuth callback | `GET /auth/google/callback` | **DEFERRED** | Same |
| B4 | Session me | `GET /auth/me` | **BUILT** | Console chrome; needs session token |
| B5 | Logout | `POST /auth/logout` | **BUILT** | Console logout button when authed |
| B6 | Session Bearer as manage auth | Middleware | **BUILT** | Alternate to API key |
| B7 | Email allowlist | Auth service | **BUILT** | Only when Google configured |
| B8 | Self-serve multi-user tenancy | Product | **DEFERRED** | PRD out of v1 |
| B9 | Billing / plans enforcement | Product | **OUT** | Directional pricing on marketing |

---

## C. Link CRUD (core)

| # | Feature | API | Console UI | Onboarding | Status |
|---|---------|-----|------------|------------|--------|
| C1 | Create link + primary dest | `POST /api/links` | Yes | Yes | **PASS** |
| C2 | Custom slug | create body `slug` | Yes (optional) | Yes (optional) | **PASS** |
| C3 | Custom domain field | create body `domain` | Yes | Yes | **PASS** (free text; no DNS verify) |
| C4 | List links | `GET /api/links` | Yes | Health probe only | **PASS** |
| C5 | Get link + dests + rules | `GET /api/links/:id` | Yes (detail panel) | No | **PASS** |
| C6 | Patch link settings | `PATCH /api/links/:id` | **No** | No | **API-ONLY** (is_active / expires / click_limit) |
| C7 | Soft-delete | `DELETE /api/links/:id` | **Yes** (confirm) | No | **PASS** · redirect stops after delete |
| C8 | Reserved slug reject | create | N/A | N/A | **PASS** (`api` → 400) |
| C9 | Password on create | body `password` | No | No | **PARTIAL** — field accepted; hash not fully wired |
| C10 | Expiry / click_limit on create | body | No | No | **PARTIAL** — schema + resolve enforce; UI none |
| C11 | Ownership / per-user scope | owner_id column | No | No | **PARTIAL** — column exists; single-tenant list |

---

## D. Destinations (control after print)

| # | Feature | API | Console UI | Status |
|---|---------|-----|------------|--------|
| D1 | Swap destination URL | `PATCH .../destinations/:destId` `{url}` | **Yes** (swap form) | **PASS** |
| D2 | Destination history write | on URL change | via swap form | **PASS** |
| D3 | Read history | `GET .../history` | **Yes** (history list) | **PASS** |
| D4 | Rollback last change | `POST .../rollback` | **Yes** (confirm) | **PASS** |
| D5 | Add alternate destination | `POST .../destinations` | **Yes** | **PASS** |
| D6 | Set primary / weight | PATCH flags | **No** | **API-ONLY** · weight **not used** in resolve |
| D7 | Weighted A/B routing | resolve | No | **DEFERRED** / **PARTIAL** |

---

## E. Routing rules

| # | Feature | API | Console UI | Status |
|---|---------|-----|------------|--------|
| E1 | Add rule | `POST .../rules` | **Yes** (form) | **PASS** |
| E2 | Delete rule | `DELETE .../rules/:ruleId` | **Yes** (per-row) | **PASS** |
| E3 | List rules (via get link) | embedded in GET | **Yes** | **PASS** |
| E4 | Rule types: country, device, schedule, referrer | resolve engine | No | **BUILT** — not e2e-probed per type this run |
| E5 | Update rule (PATCH) | — | No | **DEFERRED** (add/delete only) |
| E6 | Priority order first-match | resolve | No | **BUILT** |

---

## F. Redirect path (visitor)

| # | Feature | Status | Evidence |
|---|---------|--------|----------|
| F1 | `GET /:slug` → **302** Location | **PASS** | Smoke + probe |
| F2 | Domain match on Host | **PASS** | curl `-H "Host: localhost"` |
| F3 | Primary destination fallback | **PASS** | Default path |
| F4 | Rule evaluation before primary | **BUILT** | Code path; not full matrix today |
| F5 | Soft-deleted / inactive → no redirect | **PASS** | After DELETE, not 302 |
| F6 | Expiry enforced | **BUILT** | Resolve code |
| F7 | Click limit enforced | **BUILT** | Resolve code |
| F8 | Password required → 401 | **PARTIAL** | Resolve rejects; no visitor unlock page |
| F9 | Reserved paths not treated as slugs | **PASS** | Router skip map |
| F10 | Async event write with real link_id | **PASS** | Analytics after redirect |

---

## G. Analytics

| # | Feature | API | Console UI | Status |
|---|---------|-----|------------|--------|
| G1 | Summary total / human / bot | `GET .../analytics` | **Yes** (strip) | **PASS** |
| G2 | Top countries / devices / referrers | summary | No | **BUILT** |
| G3 | Clicks by day | summary | No | **BUILT** · `days` window partial on totals |
| G4 | Raw events | `GET .../events` | No | **API-ONLY** **PASS** |
| G5 | Bot detection (UA) | write path | N/A | **PASS** coarse |
| G6 | IP hashed (no raw IP out) | events | N/A | **BUILT** |
| G7 | click_count includes bots | DB trigger | — | **PARTIAL** known PRD gap |
| G8 | Marketing analytics charts | `/tinyme` | SAMPLE | **SAMPLE** labeled sample |

---

## H. Operator console (`/console`)

| # | Feature | Status |
|---|---------|--------|
| H1 | Session config: API base + key | **PASS** (sessionStorage) |
| H2 | Health button | **PASS** |
| H3 | Create link form | **PASS** |
| H4 | List links + select detail | **PASS** |
| H5 | Show short address + destinations + rules (read) | **PASS** |
| H6 | Swap primary destination | **PASS** |
| H7 | Soft-delete button | **PASS** (confirm → DELETE) |
| H8 | History panel + rollback | **PASS** |
| H9 | Analytics strip | **PASS** (total / human / bot) |
| H10 | Add/delete rules UI | **PASS** |
| H11 | Add secondary destination UI | **PASS** |
| H12 | Onboarding gate (`localStorage` done) | **PASS** |
| H13 | OAuth return `?st=` token | **BUILT** (Google off locally) |
| H14 | Google chrome / logout | **BUILT** when session present |

---

## I. Onboarding (`/onboarding`)

| # | Feature | Status |
|---|---------|--------|
| I1 | Welcome → intent → create → done steps | **PASS** (smoke structure) |
| I2 | Intent chips (print / QR / social / swap) | **PASS** UX |
| I3 | Create first link live | **PASS** smoke create 201 |
| I4 | Auto-copy short address | **PASS** code path |
| I5 | API base/key sheet when offline/401 | **PASS** code |
| I6 | World plates + soft loops | **PASS** assets smoke |
| I7 | No fake demo short URL | **PASS** (removed) |
| I8 | Mark done → console path | **PASS** |
| I9 | Domain lock SYSTEM HALT (unconfigured domain) | **PASS** — funny halt + 🐐 credit |

---

## J. Marketing / studio surfaces

| # | Feature | Status |
|---|---------|--------|
| J1 | Studio home `/` | **PASS** page loads |
| J2 | Product page `/tinyme` | **PASS** · feature claims mixed LIVE vs SAMPLE |
| J3 | Scroll world `/world` | **PASS** thesis experience |
| J4 | Fake console tabs on marketing | **SAMPLE** not live API |
| J5 | Pricing cards | **OUT** directional |
| J6 | Custom domains lifecycle | **OUT** |
| J7 | QR generation service | **OUT** |
| J8 | Tags / folders / workspaces | **OUT** |
| J9 | Webhooks / SDKs | **OUT** |
| J10 | Destination health probes | **OUT** |

---

## K. Private-beta must-work (PRD §6.1)

| # | Must-work | Status |
|---|-----------|--------|
| K1 | Create link with destination | **PASS** |
| K2 | Public short URL → 302 | **PASS** |
| K3 | Swap destination; next click new URL | **PASS** (API + console) |
| K4 | History + rollback once | **PASS** (console + API) |
| K5 | At least one rule e2e | **PASS** device rule (mobile UA → alt dest) |
| K6 | Soft-delete; redirect stops | **PASS** (console + API) |
| K7 | Analytics human vs bot | **PASS** (console strip + API) |
| K8 | List recent events | **API PASS** · **UI MISSING** |
| K9 | Non-empty API key in deploy | **LOCAL PASS** fail-closed · prod gate separate |
| K10 | Honest marketing status | **PARTIAL** — still “private prototype” language |

---

## Scoreboard (honest)

| Layer | Works? |
|-------|--------|
| **Core loop** create → 302 → analytics | **Yes** |
| **Control** swap dest | **Yes** (console + API) |
| **History / rollback** | **Yes** (console + API) |
| **Soft-delete** | **Yes** (console + API) |
| **Rules** | **Yes** (add/delete + list) |
| **Analytics strip** | **Yes** (total / human / bot) |
| **Google OAuth** | **Code yes · local off** |
| **Marketing “full product” claims** | **No — sample / direction** |
| **Everything as a polished app** | **Not yet** — console covers private-beta ops except rules editor |

**Bottom line:** Private-beta operator loop is **console-complete**: create, list, swap, history, rollback, analytics strip, soft-delete, add destinations, add/delete rules. Still open: events stream UI, multi-user, Google OAuth env, marketing honesty polish.

---

## How to re-verify

```powershell
# Stack: Docker Desktop, tinyme-pg, API on 8080, site on 4173
$env:API_KEY = "dev-local-key"   # match server
.\scripts\smoke-tinyme.ps1
.\scripts\smoke-onboarding.ps1
```

Update this file after each console phase (1a soft-delete, 1b history/rollback, 1c analytics strip).

---

## Next UI gaps (planned)

1. ~~Console soft-delete~~ **done**  
2. ~~History list + rollback~~ **done**  
3. ~~Analytics strip~~ **done**  
4. ~~Rules create / delete UI~~ **done**  
5. Events list (optional raw stream)  
6. Honesty pass on `/tinyme` sample vs live labeling  
7. Device-rule e2e smoke (UA → alternate dest)  
8. Buy + DNS + fill `LOCKED_DOMAINS` in `domain-lock.js`  
 
 
 
