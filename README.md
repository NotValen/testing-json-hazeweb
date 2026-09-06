# Haze Division — prototype

Single-page prototype for the Haze Division site, exported from Claude Design.

- `haze-prototype.dc.html` — the page. Served at `/` through the rewrite in `vercel.json`.
- `support.js` — the `.dc.html` runtime. Pulls React 18 and Babel from unpkg at load time, then renders the `<x-dc>` template.
- `assets/` — logo variants, emblem, favicon, grain texture.

Live: https://hazedivisionprototype.vercel.app

## Works section — live data + audio

The Works list is not hardcoded. On load the page calls `/api/works`, which
returns every real upload from the roster and plays real audio.

- `api/works.js` — pulls every public SoundCloud upload from **skesh**
  (`soundcloud.com/skeshbtw`) and **nuzzi** (`soundcloud.com/1nuji`) via the
  SoundCloud v2 API, plus each artist's Spotify top tracks, matches them by
  title, and sorts by play count. Real plays / durations / artwork.
- `api/stream.js` — `GET /api/stream?id=<sc track id>` → 302 to a fresh signed
  SoundCloud MP3 so the page's `<audio>` element can stream the full track
  same-origin. Spotify-only tracks fall back to the 30-second preview.
- `lib/sc.js`, `lib/sp.js` — the scrapers. SoundCloud needs no API key: the
  `client_id` is lifted from its own web bundle and auto-refreshed on a 401.
  Spotify data comes from the public embed page's `__NEXT_DATA__` blob.

Clicking anywhere on a track row plays it; each row also has a small "open in
SoundCloud / Spotify" link.

## Local dev

    npm run dev        # http://localhost:3210 — serves the page + mounts api/* like Vercel

No build step for the page itself; open `haze-prototype.dc.html` for a static
preview (Works will show a retry state without the API running).
