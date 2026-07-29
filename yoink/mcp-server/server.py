"""Yoink MCP server — exposes yt-dlp media lookup/download as MCP tools.

Run:
    python3 server.py

Then point an MCP client (Claude Desktop, Claude.ai remote MCP via a tunnel, etc.)
at this process over stdio. See README.md for client setup.
"""

import os
from typing import Optional

import yt_dlp
from mcp.server.mcpserver import MCPServer

mcp = MCPServer(
    name="yoink",
    description="Look up metadata and download media from YouTube, TikTok, Instagram, and X/Twitter links.",
)

SUPPORTED_PLATFORMS = {
    "youtube": ["youtube.com", "youtu.be"],
    "tiktok": ["tiktok.com"],
    "instagram": ["instagram.com"],
    "x": ["twitter.com", "x.com"],
}


def _extract_info(url: str, download: bool = False, output_dir: Optional[str] = None):
    ydl_opts = {"quiet": True, "no_warnings": True, "skip_download": not download}
    if download:
        os.makedirs(output_dir, exist_ok=True)
        ydl_opts["outtmpl"] = os.path.join(output_dir, "%(title).100s.%(ext)s")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        return ydl.extract_info(url, download=download)


@mcp.tool()
def list_supported_platforms() -> dict:
    """List the social platforms Yoink explicitly targets.

    yt-dlp (the extraction engine behind this server) actually supports ~1800
    sites; this list is just the ones Yoink's frontend and docs focus on.
    """
    return {"platforms": SUPPORTED_PLATFORMS}


@mcp.tool()
def get_media_info(url: str) -> dict:
    """Fetch title, uploader, duration, thumbnail, and available formats for a media URL.

    Does not download anything. Use this first to see what formats/qualities
    are available before calling download_media.
    """
    info = _extract_info(url, download=False)
    formats = [
        {
            "format_id": f.get("format_id"),
            "ext": f.get("ext"),
            "resolution": f.get("resolution") or f.get("format_note"),
            "vcodec": f.get("vcodec"),
            "acodec": f.get("acodec"),
            "filesize_approx": f.get("filesize") or f.get("filesize_approx"),
        }
        for f in info.get("formats", [])
    ]
    return {
        "title": info.get("title"),
        "uploader": info.get("uploader"),
        "duration_seconds": info.get("duration"),
        "thumbnail": info.get("thumbnail"),
        "webpage_url": info.get("webpage_url"),
        "formats": formats,
    }


@mcp.tool()
def get_download_url(url: str, format_id: Optional[str] = None) -> dict:
    """Resolve a direct CDN URL for a media file, without downloading it.

    Warning: the returned URL is often IP/header/expiry-bound (especially for
    YouTube) and may not work if opened from a different machine, browser, or
    after a short delay. If you need a reliable file, use download_media
    instead, which downloads through yt-dlp itself.
    """
    ydl_opts = {"quiet": True, "no_warnings": True, "skip_download": True}
    if format_id:
        ydl_opts["format"] = format_id
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        chosen = info
        if "requested_formats" in info:
            return {
                "title": info.get("title"),
                "parts": [
                    {"format_id": f.get("format_id"), "ext": f.get("ext"), "url": f.get("url")}
                    for f in info["requested_formats"]
                ],
                "note": "Multiple parts (video+audio) need muxing with ffmpeg — use download_media for a single playable file.",
            }
        return {"title": info.get("title"), "url": chosen.get("url"), "ext": chosen.get("ext")}


@mcp.tool()
def download_media(url: str, output_dir: str = "./downloads", format_id: Optional[str] = None) -> dict:
    """Download a media file to local disk via yt-dlp, merging audio/video with ffmpeg if needed.

    Requires ffmpeg to be installed for formats that need muxing (common for
    YouTube above 720p). Returns the local file path on success.
    """
    ydl_opts = {"quiet": True, "no_warnings": True}
    if format_id:
        ydl_opts["format"] = format_id
    os.makedirs(output_dir, exist_ok=True)
    ydl_opts["outtmpl"] = os.path.join(output_dir, "%(title).100s.%(ext)s")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        path = ydl.prepare_filename(info)
    return {"title": info.get("title"), "path": os.path.abspath(path)}


if __name__ == "__main__":
    mcp.run(transport="stdio")
