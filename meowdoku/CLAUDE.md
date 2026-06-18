@session-index.md
@TASKS.md

# Meowdoku Solver — CLAUDE.md

## Tech stack

- Vanilla HTML + CSS + JavaScript — no framework, no build step
- Hosted on GitHub Pages (static files only)
- No external dependencies

## Running locally

Open `index.html` directly in a browser, or:
```
python3 -m http.server 8080
```
Then visit http://localhost:8080

## File structure

| File | Purpose |
|---|---|
| `index.html` | App shell |
| `style.css` | All styles (mobile-first) |
| `solver.js` | Pure backtracking CSP solver — no DOM |
| `app.js` | State management + DOM + event handling |

## Solver API

`solveMeowdoku(grid, n)` — accepts `grid[row][col] = colorIndex` (integer ≥ 0, or -1 for uncolored).
Returns `placed[row] = col` (array of length n) or `null` if unsolvable.

Constraints enforced: 1 cat per row, 1 per column, 1 per color region, no two cats touching (including diagonally).

## Key decisions

See `docs/decisions.md`.

## End-of-session checklist

When user says "prepare for clear", "wrap up", or "all mds updated":

1. Write `docs/sessions/YYYY-MM-DD-session-NN-wolfgang.md`
2. Update `session-index.md`
3. Append to `CHANGELOG/YYYY-MM-DD.md`
4. Update `TASKS.md`
5. Update any `docs/tasks/` files discussed
6. Update `docs/decisions.md` for non-obvious decisions
