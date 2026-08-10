# GitHub Pages — static demo

**URL (project pages):** https://zwin-ux.github.io/ordani-2026/  
**What ships:** studio home, TinyMe marketing, world, onboarding UI, console UI, showcase gallery, domain STOP halt.  
**What does not:** live short links / Go API / Postgres. Create → arcade STOP.

---

## One-time repo setup

1. Open **GitHub → Zwin-ux/ordani-2026 → Settings → Pages**.
2. **Build and deployment → Source:** **GitHub Actions**.
3. Push to `main` (or run **Actions → Deploy GitHub Pages → Run workflow**).
4. Wait for the green check. Open the site URL above.

### Optional: custom domain

1. Add DNS CNAME/A per GitHub docs.
2. Repo **Settings → Pages → Custom domain**.
3. Repo **Settings → Secrets and variables → Actions → Variables**  
   - Name: `PAGES_BASE`  
   - Value: *(empty)* so paths are site-root absolute.

Default variable is `/ordani-2026` (project pages).

---

## Day-to-day

```bash
# Local site (dev)
npm start
# http://localhost:4173/

# Build what Pages will serve
npm run pages:build
# preview
npm run pages:preview
```

### Drop screenshots / GIFs

1. Put files in `public/assets/showcase/`  
2. Edit `public/assets/showcase/manifest.json`  
3. Push `main` → auto deploy  

Gallery: `/showcase` on the live Pages URL.

---

## Routes on Pages

| Path | Page |
|------|------|
| `/` | Studio |
| `/tinyme` | Product |
| `/world` | Scroll world |
| `/onboarding` | First-link UI |
| `/console` | Operator UI (no API) |
| `/showcase` | Screens / gifs |
| `/onboarding?halt=1` | Force domain STOP |

---

## Notes

- `.nojekyll` is written into `dist/` so asset paths stay intact.
- Build rewrites absolute `/…` paths to `PAGES_BASE`.
- Do not expect `localhost:8080` API calls to work on Pages.
- Print-safe short links need a bought domain + Railway API (see `TINYME-SETUP.md`).
