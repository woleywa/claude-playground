# Zlatan — CLAUDE.md

## Tech stack

Vanilla HTML + CSS + JavaScript — no build step, no external dependencies.
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
| `index.html` | Page structure — featured strip + quotes/facts lists |
| `style.css` | Styles (black/gold theme) |
| `app.js` | Quote/fact data, random featured pick per visit, 👍/👎 voting (`localStorage`) |

## Features

- **Featured strip** — one random quote + one random fact shown at the top on every visit.
- **Voting** — 👍/👎 on every item, persisted in `localStorage['zlatan_votes']`; click again to un-vote.

## Content guidelines

- Quotes: real Zlatan quotes, always in his 3rd-person voice where applicable
- Facts: the classic "Chuck Norris facts" format applied to Zlatan
- Keep it lean — no images, no external dependencies, no build step
