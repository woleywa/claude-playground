# Zlatan — CLAUDE.md

## Tech stack

Vanilla HTML + CSS — no JavaScript, no build step, no dependencies.
Hosted on GitHub Pages as part of the `claude-playground` repo.

## Running locally

Open `index.html` directly in a browser, or serve from repo root:
```
python3 -m http.server 8080
```
Then visit http://localhost:8080/zlatan/

## File structure

| File | Purpose |
|---|---|
| `index.html` | All content — quotes and facts |
| `style.css` | Styles (black/gold theme) |

## Content guidelines

- Quotes: real Zlatan quotes, always in his 3rd-person voice where applicable
- Facts: the classic "Chuck Norris facts" format applied to Zlatan
- Keep it lean — no images, no JS, no external dependencies
