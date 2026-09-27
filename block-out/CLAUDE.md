# Block Out Solver — CLAUDE.md

## Tech stack

Vanilla HTML + CSS + JS, no build step, no dependencies. Hosted on GitHub Pages as part of `claude-playground`.

| File | Purpose |
|---|---|
| `index.html` | Markup |
| `style.css` | Styles |
| `engine.js` | Rules + solver (pure, also loadable in Node via `require`) |
| `detect.js` | Screenshot → level: `locate()` finds the grid automatically, `run()` reads cells, walls, pieces, exits |
| `app.js` | Editor, screenshot import UI, solution playback, presets, `localStorage` persistence |

## Game rules (confirmed by Wolfgang)

- Pieces can be any shape (`shape` = cell offsets; absent = rectangle); boards can have walls (staircase edges).
- A piece can be dragged anywhere through empty cells.
- A piece leaves through an exit of its own colour on the edge it touches, if the piece's span fits inside the exit.
- Ice blocks count down **once per piece that leaves** (option: per cell); at 0 the piece underneath is free.
- Frozen exits (white numbered tiles) count down **once per move** (every drag).
- A piece with a key opens the lock of its **own colour** when it leaves.
- Layered piece (`inner`): the outer colour leaves through its exit; the core piece stays where it was.
- Crates (`crate: true`, colour `'?'`): count down like ice; contents are unknown until they open (usually more pieces).
- Colours under ice, inside crates and of frozen exits are unknown (`'?'`) until they thaw.

## Solver

Leaving only ever helps (frees space, ticks counters, opens locks) and drags are reversible, so the solver
greedily takes any available exit; when none, BFS (≤3 repositionings) for moves that unblock one; when still
stuck, it shuffles a piece to thaw the next frozen exit. It stops as soon as a thawed piece/exit has an
unknown colour — the user plays the steps and imports a new screenshot.

## Screenshot detection

Reference colours in `detect.js` were measured on Levels 198 and 204 (iPhone screenshots).

- **locate()**: frame-coloured blocks → segments (exits break the frame ring) merged into one outline;
  grid edges = where the frame (plus its dark inner bevel) ends, taking the outermost edge seen by
  enough scan lines; column count = the lattice whose lines best match dark seams (largest n within 80%
  of the best score, so a 2× lattice doesn't win). Manual box = fallback via "Wrong board? Adjust".
- **run()**: cell colour = average over the middle 60%; icon cells (average fits nothing) use corners.
  Walls = background reachable from the screen edge (flood fill on coarse blocks), plus frame-coloured
  cells connected to it; other frame-coloured cells are crates (crate planks ≈ frame colour).
  Seams = a thin line < 60% as bright as the faces beside it, sampled away from the border's middle
  (keys sit there). Ice blocks touch without seams, so they're split by where their digits sit.
  Padlock = icon cell with gold near its middle (not for yellow/orange). Layered = a different colour
  at the centre of every cell. Frozen tiles spanning several cells have no gap between them.
- Numbers are not OCR'd — the user types them.

## Testing

- "Small demo" preset → ✓ Solved: 5 steps.
- "Level 198" preset → 10 steps, then stuck waiting for 3 thawed exit colours.
- "Level 204" preset → 5 wait moves, then stuck waiting for the thawed right exit's colour.
- Importing the Level 198 / 204 screenshots auto-detects 7×10 boards: 31 pieces + 11 exits / 14 pieces + 5 exits.
