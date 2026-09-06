# Haze Division — prototype

Single-page prototype for the Haze Division site, exported from Claude Design.

- `haze-prototype.dc.html` — the page. Served at `/` through the rewrite in `vercel.json`.
- `support.js` — the `.dc.html` runtime. Pulls React 18 and Babel from unpkg at load time, then renders the `<x-dc>` template.
- `assets/` — logo variants, emblem, favicon, grain texture.

No build step. Open `haze-prototype.dc.html` in a browser to preview locally.

Live: https://hazedivisionprototype.vercel.app
