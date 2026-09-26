# Block Out Solver — CLAUDE.md

## Tech stack

Vanilla HTML + CSS + JS, no build step, no dependencies. Hosted on GitHub Pages as part of `claude-playground`.

| File | Purpose |
|---|---|
| `index.html` | Markup |
| `style.css` | Styles |
| `engine.js` | Rules + solver (pure, also loadable in Node via `require`) |
| `detect.js` | Screenshot → level (colour classification, seams, ice split, keys/locks, exits) |
| `app.js` | Editor, screenshot import UI, solution playback, presets, `localStorage` persistence |

## Game rules (confirmed by Wolfgang)

- Pieces are rectangles; a piece can be dragged anywhere through empty cells.
- A piece leaves through an exit of its own colour on the edge it touches, if the piece's span fits inside the exit.
- Ice blocks count down **once per piece that leaves** (option: per cell); at 0 the piece underneath is free.
- Frozen exits (white numbered tiles) count down **once per move** (every drag).
- A piece with a key opens the lock of its **own colour** when it leaves.
- Colours under ice and of frozen exits are unknown (`'?'`) until they thaw.

## Solver

Leaving only ever helps (frees space, ticks counters, opens locks) and drags are reversible, so the solver
greedily takes any available exit; when none, BFS (≤3 repositionings) for moves that unblock one; when still
stuck, it shuffles a piece to thaw the next frozen exit. It stops as soon as a thawed piece/exit has an
unknown colour — the user plays the steps and imports a new screenshot.

## Screenshot detection

Reference colours in `detect.js` were measured on Level 198 (1184×2576 iPhone screenshot). Key heuristics:
cell colour = average over the middle 60% of the cell; seams = dark navy pixels (sum < 230, B < 120);
ice blocks touch without seams, so they're split by where their countdown digits sit; a 1×1 cell whose
average matches no reference is a padlock. Numbers are not OCR'd — the user types them.

## Testing

- "Small demo" preset → ✓ Solved: 5 steps.
- "Level 198" preset → 10 steps, then stuck waiting for 3 thawed exit colours.
- Import the Level 198 screenshot with box = grid of blocks, 7×10 → 31 pieces, 11 exits.
