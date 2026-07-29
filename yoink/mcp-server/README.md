# Yoink MCP server

Wraps [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) as MCP tools: look up metadata, get a direct
CDN URL, or download a file to disk, for YouTube/TikTok/Instagram/X links (and, incidentally,
the ~1800 other sites `yt-dlp` supports).

## Tools

| Tool | What it does |
|---|---|
| `list_supported_platforms` | Static list of the platforms this project targets |
| `get_media_info(url)` | Title, uploader, duration, thumbnail, available formats — no download |
| `get_download_url(url, format_id?)` | Direct CDN URL(s) without downloading — **fragile**, see the tool's docstring |
| `download_media(url, output_dir?, format_id?)` | Downloads to local disk (merges audio/video with `ffmpeg` if needed), returns the file path |

## Setup

```bash
cd yoink/mcp-server
python3 -m venv .venv && source .venv/bin/activate   # optional but recommended
pip install -r requirements.txt
```

You also need **`ffmpeg`** on your PATH for `download_media` to merge separate audio/video
streams (common for YouTube above 720p):
```bash
# macOS
brew install ffmpeg
# Debian/Ubuntu
sudo apt install ffmpeg
```

Smoke-test it directly:
```bash
python3 server.py
```
It should sit there waiting on stdio — that's correct, it's meant to be launched by an MCP client,
not run interactively. Ctrl+C to stop.

## Hooking it up to a local client (Claude Desktop / Claude Code)

Local MCP clients launch this script themselves over stdio — no networking needed.

**Claude Desktop** — add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "yoink": {
      "command": "python3",
      "args": ["/absolute/path/to/yoink/mcp-server/server.py"]
    }
  }
}
```
(Use the `.venv`'s Python path instead of a bare `python3` if you installed into a venv.)

**Claude Code** — add to `.mcp.json` in your project, or run:
```bash
claude mcp add yoink -- python3 /absolute/path/to/yoink/mcp-server/server.py
```

Restart the client and the `yoink` tools should show up.

## Hooking it up to Claude.ai (remote / web)

Claude.ai's web app connects to **remote** MCP servers over HTTP, not local stdio processes — it
can't launch a script on your machine. To use this server from Claude.ai you need to run it with
an HTTP transport and make it reachable over the internet:

1. Change the last line of `server.py` to:
   ```python
   mcp.run(transport="streamable-http")
   ```
   (Add host/port config as needed — check `MCPServer.run_streamable_http_async` if you want to
   customize beyond the defaults.)
2. Expose it publicly over HTTPS. For quick testing, a tunnel works:
   ```bash
   ngrok http 8000   # or cloudflared tunnel, or deploy behind your own reverse proxy
   ```
   For anything beyond a quick test, deploy it on a small VPS/container behind real HTTPS instead
   of leaving a tunnel open.
3. In Claude.ai, go to **Settings → Connectors → Add custom connector** and paste the public
   HTTPS URL.

**Before exposing this publicly, add authentication.** As written, this server has none — anyone
who reaches the URL can make your machine download arbitrary media. At minimum, put it behind a
reverse proxy that requires a bearer token/API key, or use the `mcp` package's
`auth_server_provider` / `token_verifier` hooks on `MCPServer` for OAuth-based auth. Don't expose
`download_media` to the open internet unauthenticated.

## Notes

- Keep `yt-dlp` updated (`pip install -U yt-dlp`) — platforms change frequently and extraction
  breaks first when it's stale.
- This shares its core extraction approach with `../docs/BACKEND.md` (the HTTP resolver design)
  — same `yt-dlp` calls, different transport.
- Personal-use scope: for content you have the right to save. Don't point this at bulk scraping,
  paywall/login-wall bypassing, or mass redistribution.
