# Block Out Solver — CLAUDE.md

## Tech stack

Vanilla HTML + CSS + JS, no build step, no dependencies. Hosted on GitHub Pages as part of `claude-playground`.

| File | Purpose |
|---|---|
| `index.html` | Markup |
| `style.css` | Styles |
| `engine.js` | Rules + solver (pure, also loadable in Node via `require`) |
| `detect.js` | Screenshot → level: `locate()` finds the grid automatically, `run()` reads cells, walls, pieces, exits |
| `worker.js` | Runs `Engine.solve` in a Web Worker (progress messages; main-thread fallback) |
| `app.js` | Editor, screenshot import UI, solution playback, presets, `localStorage` persistence |

## Game rules (confirmed by Wolfgang)

- Pieces can be any shape (`shape` = cell offsets; absent = rectangle); boards can have walls (staircase edges).
- A piece can be dragged anywhere through empty cells.
- A piece leaves through an exit of its own colour on the edge it touches, if the piece's span fits inside the exit.
- Ice blocks count down **once per piece that leaves** (option: per cell); at 0 the piece underneath is free.
- Frozen exits (white numbered tiles) count down **once per piece that leaves** (confirmed on Level 207:
  start counters 4/7 → 1 after six pieces left). Their colour is unknown until they thaw.
- A piece with a key opens the lock of its **own colour** when it leaves.
- Layered piece (`inner`): the outer colour leaves through its exit; the core piece stays where it was.
- Tracks (`level.tracks` = `[r, c, colour]`, hollow outlined cells): only pieces of that colour may cross.
- Items on pieces (`item: 'battery'` = time bonus, `'rocket'`) are shown but don't affect solving.
- Walls can also sit inside the board (raised frame-coloured blocks, e.g. Level 207).
- Crates (`crate: true`, colour `'?'`): count down like ice; contents are unknown until they open (usually more pieces).
- Colours under ice, inside crates and of frozen exits are unknown (`'?'`) until they thaw.

## Solver

Leaving only ever helps (frees space, ticks counters, opens locks) and drags are reversible, so the solver
takes any available exit. When none, `findUnblock` searches for drags that let one piece out, in stages:

1. BFS moving only pieces within 1 cell of the target's cheapest route out (`blockers()`: Dijkstra where
   passing another movable piece's cell costs 1).
2. "Park": BFS in the target's compartment (the area reachable without crossing tracks) until the target
   sits fully on tracks of its colour, where no other piece can interfere; the next round continues from there.
   (Level 207's 7th exit needs a ~50-drag shuffle of the top area to get a yellow bar onto its track.)
3. BFS within 2 cells, then guided best-first (g + 3·blockers) and full BFS over all pieces.

`fastSearch` is the workhorse: per-anchor footprints precomputed, identical-looking pieces interchangeable
(positions compared as sorted sets per group), states stored flat in typed arrays and deduped by a 64-bit
hash, so ~1.5M states fit in phone memory. The solver stops when a thawed exit or uncovered piece has an
unknown colour: the user plays the moves and imports a new screenshot.

## Screenshot detection

Reference colours in `detect.js` were measured on Levels 198 and 204 (iPhone screenshots).

- **locate()**: frame-coloured blocks → segments (exits break the frame ring) merged into one outline;
  grid edges = where the frame (plus its dark inner bevel) ends, taking the outermost edge seen by
  enough scan lines; column count = best of seam darkness (normalised, each line may shift ≤5% of a
  cell) × cell purity² (right lattice ⇒ each cell mostly one colour) × mild squareness; a multiple of it
  only wins if its seams score ≥80% as well.
- Import flow: decode with `createImageBitmap` at ≤2000 px long side (Safari can downsample big <img>s
  drawn to canvas), auto-locate, show the grid on the screenshot, apply only on "Use this board".
- **run()**: cell colour = average over the middle 60%; icon cells (average fits nothing) use corners.
  Walls = background reachable from the screen edge (flood fill on coarse blocks), plus frame-coloured
  cells connected to it; other frame-coloured cells are crates (crate planks ≈ frame colour).
  Seams = a thin line < 60% as bright as the faces beside it, sampled away from the border's middle
  (keys sit there). Ice blocks touch without seams, so they're split by where their digits sit.
  Seam also = ≥90% of the border <80% as bright (3D edge between stacked pieces).
  Padlock = icon cell on a piece colour with gold + a red/blue badge near its middle. Icons at a piece's
  centre (own cells only, core colour ignored): key = mostly gold + a red/blue gem, battery = purple,
  rocket = mostly red. Frame-coloured groups are crates only with an orange/red rim, else walls.
  Layered = per-cell 7×7 colour histogram with two unrelated colours (shading partners folded in),
  the rim colour is outer, the centre colour the core. Track = olive cell average; its rim gives the
  colour. Frozen tiles spanning several cells have no gap between them.
- Numbers are not OCR'd — the user types them.

## Testing

- "Small demo" preset → ✓ Solved: 5 steps.
- "Level 198" preset → 10 steps, then stuck waiting for 3 thawed exit colours.
- "Level 204" preset → 5 wait moves, then stuck waiting for the thawed right exit's colour.
- Level 207 start screenshot (counters 4/7/7/7, crate 7) → 24 pieces, 5 exits; solve ≈ 20 s → 107 moves,
  6 out, then "take a new screenshot" (top-left exit thawed). With that exit set to purple: 75 moves, 8 out.
- "Level 205" preset (top exit 10) → 10 pieces out, then the top exit thaws with an unknown colour.
- Importing the Level 198 / 204 / 205 screenshots: 7×10 (31 pieces, 11 exits) / 7×10 (14, 5) / 7×8 (14, 4 + 24 tracks).
