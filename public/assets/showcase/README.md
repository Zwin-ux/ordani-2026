# Showcase media

Drop screenshots, GIFs, and short MP4s here for the GitHub Pages gallery.

1. Add files (prefer `.webp`, `.png`, `.gif`, `.mp4`).
2. List them in `manifest.json`:

```json
{
  "items": [
    { "title": "Home scroll", "src": "/assets/showcase/scroll/home.gif" },
    { "title": "TinyMe scroll", "src": "/assets/showcase/scroll/tinyme.gif" }
  ]
}
```

3. Push to `main` — Actions deploys Pages.

`file` resolves to `/assets/showcase/<file>`. Use `src` for any site path.
