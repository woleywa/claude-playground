# Backend option: a real resolver behind Yoink

The frontend (`../index.html` / `../app.js`) runs standalone and does metadata-only lookups. This
doc describes the server-side piece that unlocks actual media downloads, and why it's necessary.

## Why the browser alone can't do this

1. **CORS.** None of YouTube, TikTok, Instagram, or X expose a cross-origin-readable endpoint
   that returns an actual media file for an arbitrary post. Their oEmbed endpoints (where they
   exist) are CORS-friendly but only return title/author/thumbnail — never a video file.
2. **Extraction logic.** Getting a real media URL out of a YouTube watch page, a TikTok item, or
   a tweet requires parsing internal JSON blobs embedded in server-rendered HTML, following
   redirects, sometimes decrypting signature ciphers (`n`-parameter on YouTube), or authenticating
   (Instagram). This logic changes often and is exactly what
   [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) already maintains for ~1800 sites — don't
   reimplement it.
3. **CDN URLs are fragile even once you have them.** A direct googlevideo/TikTok CDN URL that
   `yt-dlp` extracts is frequently bound to the request's IP, headers, or a short expiry. Handing
   that raw URL straight to a browser `<a href>` cross-origin often **403s**, because the browser
   request doesn't carry the same headers `yt-dlp` used to obtain it. The reliable pattern is to
   **stream the media through your backend**, not just hand back the raw CDN link.

## Recommended shape: a small resolver service

A single service, two responsibilities:

- `POST /resolve` — given a URL, return metadata + a list of available formats. Fast, no download.
- `GET /download` — given a resolved format id (or the original URL + quality), stream the actual
  bytes back with the right `Content-Type` / `Content-Disposition`, so the browser's native
  download flow just works regardless of the source CDN's quirks.

### `POST /resolve`

Request:
```json
{ "url": "https://www.youtube.com/watch?v=..." }
```

Response (this is the contract `app.js`'s "Backend resolver" hook already expects):
```json
{
  "title": "Some video",
  "author": "Some channel",
  "thumbnail": "https://i.ytimg.com/vi/.../hqdefault.jpg",
  "formats": [
    { "label": "1080p MP4", "quality": "1080p", "ext": "mp4", "url": "https://your-resolver/download?id=abc123&fmt=137+140" },
    { "label": "Audio only (m4a)", "quality": "audio", "ext": "m4a", "url": "https://your-resolver/download?id=abc123&fmt=140" }
  ]
}
```

Point Yoink's "Backend resolver" setting (bottom of the page) at your resolver's base URL — it
already POSTs here first and falls back to oEmbed if this fails or isn't configured.

### `GET /download`

Re-runs (or reuses a cached) `yt-dlp` extraction for the given id/format, then either:
- proxies the bytes through your server (`ffmpeg`/`yt-dlp` piped to the HTTP response), or
- redirects to the CDN URL **only** if you've confirmed that particular host tolerates
  direct browser fetches (works for some CDNs, not for YouTube's).

Proxying is simpler to get right; redirecting is cheaper on your server's bandwidth. Start with
proxying.

## Implementation sketch (Python + yt-dlp)

```python
# resolver.py — FastAPI, run with: uvicorn resolver:app --port 8787
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class ResolveRequest(BaseModel):
    url: str

@app.post("/resolve")
def resolve(req: ResolveRequest):
    with yt_dlp.YoutubeDL({"quiet": True, "skip_download": True}) as ydl:
        info = ydl.extract_info(req.url, download=False)
    formats = [
        {
            "label": f"{f.get('height', '')}p {f.get('ext', '')}".strip(),
            "quality": f.get("format_note") or f.get("height"),
            "ext": f.get("ext"),
            "url": f"/download?url={req.url}&format_id={f['format_id']}",
        }
        for f in info.get("formats", [])
        if f.get("vcodec") != "none" or f.get("acodec") != "none"
    ]
    return {
        "title": info.get("title"),
        "author": info.get("uploader"),
        "thumbnail": info.get("thumbnail"),
        "formats": formats,
    }

@app.get("/download")
def download(url: str, format_id: str):
    ydl_opts = {"quiet": True, "format": format_id, "outtmpl": "-"}
    # Simplest correct approach: download to a temp file, then stream it —
    # piping yt-dlp's stdout directly needs `outtmpl: "-"` plus careful
    # postprocessor handling (merging separate audio/video streams needs ffmpeg).
    import tempfile, os
    with tempfile.TemporaryDirectory() as tmp:
        ydl_opts["outtmpl"] = os.path.join(tmp, "%(id)s.%(ext)s")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            path = ydl.prepare_filename(info)
        def iterfile():
            with open(path, "rb") as f:
                yield from f
        return StreamingResponse(iterfile(), media_type="application/octet-stream")
```

This is a starting point, not production code: it downloads to a temp file per request (fine for
personal use, not for concurrent heavy traffic), has no auth/rate-limiting, and doesn't cache
repeated resolutions. For personal/self-hosted use this is enough; harden it before exposing it
publicly.

**Requires `ffmpeg`** on the host for any format that needs muxing separate audio/video streams
(common for YouTube above 720p).

## Deployment

- **Local / LAN use (recommended to start):** run it on your own machine or home server
  (`uvicorn resolver:app --host 0.0.0.0 --port 8787`), point the Yoink "Backend resolver" setting
  at `http://<your-machine>:8787` from your phone/laptop on the same network.
- **Small VPS / container:** works the same way; put it behind HTTPS (e.g. Caddy/nginx) since
  Yoink's frontend is served over HTTPS from GitHub Pages and mixed-content blocking will reject
  a plain-HTTP resolver from an HTTPS page.
- **Keep `yt-dlp` updated.** Platforms change their internals frequently; `yt-dlp` ships fixes
  fast, but a stale pinned version breaks first. `pip install -U yt-dlp` regularly, or automate it.

## Reusing this for the MCP server

`../mcp-server/` wraps the same `yt-dlp` extraction logic behind MCP tools instead of an HTTP API,
so Claude (via Claude Desktop, Claude.ai, or any MCP client) can look up and download media
directly. It's the same core extraction code as above, exposed differently — see
`../mcp-server/README.md`.

## Scope and etiquette

- This is a personal-use tool for content you have the right to save (your own posts, permissively
  licensed media, or things a platform's own "save"/"share" feature already lets you take out).
- Don't build this into anything that does bulk/mass scraping, bypasses login walls or paywalls,
  or evades a platform's rate limits — that's a different, unsupported use case.
- Respect each platform's Terms of Service for how you use downloaded content; `yt-dlp` and this
  resolver are just plumbing, not a legal opinion.
