# Yoink — CLAUDE.md

Social media downloader: paste a YouTube / TikTok / Instagram / X (Twitter) link, get metadata
and (where possible) a download.

## Tech stack

- Frontend: vanilla HTML + CSS + JavaScript — no build step, no external dependencies.
- Hosted on GitHub Pages as part of the `claude-playground` repo.
- Optional backend + MCP server live alongside it (see below) but are not required to run the site.

## Running locally

Open `index.html` directly in a browser, or serve from repo root:
```
python3 -m http.server 8080
```
Then visit http://localhost:8080/yoink/

## File structure

| Path | Purpose |
|---|---|
| `index.html` | App shell |
| `style.css` | Styles (dark theme, mobile-first, responsive) |
| `app.js` | Platform detection, oEmbed metadata fetch, thumbnail download, backend-resolver hook, localStorage history |
| `docs/BACKEND.md` | Design doc for the optional server-side resolver (why client-side can't do real downloads, and how to build the backend) |
| `mcp-server/` | Standalone Python MCP server wrapping `yt-dlp`, for hooking this up to Claude.ai / Claude Desktop / other MCP clients |

## Why client-side is metadata-only

Browsers block cross-origin `fetch` to most platforms' internal APIs (CORS), and none of
YouTube/TikTok/Instagram/X expose a public, unauthenticated, CORS-friendly endpoint that returns
an actual downloadable media file for an arbitrary post:

- **YouTube, TikTok** — public oEmbed endpoints exist and are CORS-friendly, but only return
  title/author/thumbnail, not a video file.
- **X/Twitter** — same, via `publish.twitter.com/oembed`.
- **Instagram** — the public oEmbed endpoint was retired in 2020; what remains requires a Graph
  API access token tied to an approved Meta app, so it isn't even reachable unauthenticated.

So the app does the honest thing: it fetches what metadata it can, offers a thumbnail download
(with a graceful fallback to "open in new tab" if the CDN blocks cross-origin `fetch`), and is
upfront in the UI when a real media download isn't possible without a backend. See
`docs/BACKEND.md` for the server-side option, which the frontend already has a hook for (see
"Backend resolver" settings panel — `POST {resolverUrl}/resolve`).

## Key decisions

- No fake success states — if something can't be done client-side, the UI says so and points at
  `docs/BACKEND.md` rather than pretending.
- Instagram oEmbed is never attempted (it always 401s without a token) — skip straight to the
  "needs a backend" message instead of wasting a network round trip.
- `localStorage['yoink_resolver_url']` — optional backend base URL; when set, the frontend calls
  it before falling back to oEmbed.
- `localStorage['yoink_history']` — last 10 lookups, for quick re-fetching.

## Content/use guidelines

- General-purpose downloader (any public URL a user pastes), not restricted to the user's own
  content — but don't add features aimed at bulk/mass scraping, bypassing login walls, or
  circumventing rate limits.
