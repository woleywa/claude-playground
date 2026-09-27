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
- Inner exits (Level 215): an exit set into a wall inside the board. `gate.at` = the first open row/col
  in front of it (e.g. `{ side: 'T', start: 6, len: 1, at: 5 }` = leave upward from row 5, col 6; the exit's
  own cell (4,6) is a wall). `Engine.laneOf` handles both kinds. Draw exit on a wall cell makes one facing
  the open neighbour nearest the tap (app.js `addInnerGate`, `innerCells`).
- Arrow pieces (`axis: 'h'|'v'`, flat face with a big ⇔/⇕): move and leave only along the arrow.
- Star pieces (`star`, cream star studs) leave only through star exits (`gate.star`); normal pieces
  may use star exits too (Level 211).
- Chained piece (`chain`, `lock` = padlock number, `lockColor` = badge colour): each key piece whose gem
  (`keyColor`) matches the badge that leaves counts it down (Level 218, confirmed). 1×1 lock cells keep
  the old rule (key piece of the lock's own colour).
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
  Seams are judged against the cell's own mid-lines (studs repeat twice per cell, so inside a piece a
  border looks like a mid-line; a seam between pieces is < 75% as bright over half its length).
  Padlock = icon cell on a piece colour with gold + a red/blue badge near its middle. Icons at a piece's
  centre (own cells only, core colour ignored): key = mostly gold + a red/blue gem, battery = purple,
  rocket = mostly red. Frame-coloured groups are crates only with an orange/red rim, else walls.
  Layered = per-cell 7×7 colour histogram with two unrelated colours (shading partners folded in),
  the rim colour is outer, the centre colour the core. Track = olive cell average; its rim gives the
  colour. Frozen tiles spanning several cells: split only where a dark gap runs across the tile's inner
  and outer edges (its number sits in the middle, often right on a cell border).
  Walls from the background flood need 2+ sides on the board edge or other walls (a thin gap between
  frozen tiles can leak the flood into one empty cell). A crate's number badge always joins its crate.
  Ice without readable digits stays whole if its cells form a rectangle.
  Exit colour = nearest piece colour of the darker 60% of coloured samples (exits are two-tone and
  carry a white arrow). Star cell = ≥12% pale unsaturated pixels spread over 3+ quarters (a centred
  icon isn't); colour from the non-pale pixels; starry cells among crate cells are crate (moons).
  Arrow piece = studless face (low gradient texture); axis from how its edges spread vs its box.
  When one side of the frame is all exits, its edge is mirrored and snapped to the other axis's cells.
- Numbers (frozen exits, crates, ice) are read: `glyphs()` cuts the digits out of a box (ink rule per
  style: warm cream on frozen tiles, white on crate badges, bright cyan on ice), each digit becomes a
  7×10 bitmap + aspect, matched to `TEMPLATES` (85 digits cut from Levels 198–214 screenshots, style-
  tagged). To add samples: label a screenshot's counters and regenerate the template string.
  Frozen tiles are split by counting numbers along a run (warm digit clusters > 0.25 cell apart).
- A crate fragment without a readable number is merged into the neighbouring crate (preferring the one
  that becomes a rectangle) — the rim can cut corners off in some resamplings.
- Padlock needs ≥15% gold in its cell (rockets are mostly red); in icon cells the colour covering most
  of the cell wins over the corners (a big double rocket can cover them).
- Narrow crates: a cell with ≥15 plank samples and only rim colours (yellow/orange/red) is crate.
  An icon cell (battery) whose average is frame-coloured but whose corners and ≥15 samples show one piece
  colour is that piece.
- Inner exit = a flat (low texture) 1×1 piece with ≥3% white pixels and exactly one open neighbour
  (others are walls or off the board) → becomes a wall cell + a gate with `at`, facing that neighbour.
  (Level 216) Now: a straight bar of 1–3 cells, both ends walled, ≥1% pure-white pixels (pieces show
  none; texture didn't separate them); the way out comes from the white arrow's narrow end (`arrowDir`).
  Frozen cells inside the board are inner frozen exits, facing the side with pieces; number read as 'g'.
  Small empty pockets closed in by walls/exits become walls.
- Purple (non-olive) tracks: smooth cell (lum sd < 12), ring mostly one piece colour, centre not a piece
  colour. Wall flood stops at cells with ≥5 rim-coloured samples (crate rims), so a crate that touches
  walls stays a crate. Plank cells with more crate than frame samples are crate, not frame.
- Seams: for piece colours, only border points with the piece colour 0.2 cell to both sides count
  (a battery on the border hid the seam's absence); with <3 such points, or half the border or more
  hidden by an icon, the cells join (an icon sits on one piece; the leftover end points are dark bevels).
- locate(): a finer multiple lattice also wins when the coarse one is impure (<0.8) and the finer is
  ≥0.07 purer with ≥60% of the seam score (a big seamless crate favoured 4×5 over 8×10).

## Testing

- "Small demo" preset → ✓ Solved: 5 steps.
- "Level 198" preset → 4 out, then no 5th exit found within the time limit (exits at 1 need one more piece out).
- "Level 204" preset → 5 out in ~1 s, then the right exit thaws with an unknown colour.
- Level 207 start screenshot (counters 4/7/7/7, crate 7) → 24 pieces, 5 exits; solve ≈ 20 s → 107 moves,
  6 out, then "take a new screenshot" (top-left exit thawed). With that exit set to purple: 75 moves, 8 out.
- Level 213 → 7×12: 6×7 crate, wall row with a gap, T/green/orange/ice whole; 3 moves then screenshot.
- Level 211 screenshots → 7×9; later state: 12 of 15 out, then two thawed exits need a screenshot.
- "Level 205" preset (top exit 10) → 10 pieces out, then the top exit thaws with an unknown colour.
- Level 215 → 7×8: crates 13 / 11, inner purple ▲ exit at r4 c6, frozen 9 / 3 / 1; 46 moves, 3 out, then a
  screenshot (two frozen exits thawed).
- Level 216 → 8×10: 8×4 crate 5, purple track 2×3, inner exits sky ▼ / blue ▼ (2 wide) / frozen 1;
  13 moves, blue out, then a screenshot (the inner frozen exit thawed).
- Level 218 → 7×10 (staircase): chained yellow 2×2 padlock 3 (red badge), 3 red-gem keys, layered
  L pieces, sky bottom exit; solver needs ~45 s for the first exit (sky out at the bottom).
- Importing the Level 198 / 204 / 205 screenshots: 7×10 (31 pieces, 11 exits) / 7×10 (14, 5) / 7×8 (14, 4 + 24 tracks).

## Level 218 notes (detection)
- Grid: when the plain lattice misses the squareness test (a side edge found a little off), square
  cells sized from the height are tried, aligned to either side (Safari-like coarse resampling).
- Chains: lavender links (|R−G|<30, B > max+25, B−R<90, lum>100) along ≥40% of a border between two
  cells join them; the padlock is the chained line end/middle with the most dark-red badge pixels;
  the cells around it join; number read with the crate-badge OCR style.
- Padlock cells (1×1 lock) need white digit pixels too (a key cell is gold with a red gem, no white).
- Icons are looked for at every cell centre, between neighbouring cells and at 2×2 junctions (keys on
  L-pieces sit on one cell). Gold isn't counted when choosing the spot on yellow/orange pieces.
- Layered cells with the same core join unless a navy gap separates them.
- Exit runs of partner colours (sky/blue) are decided from all their samples together.
- Star cells need ≥8 cream samples in all four quarters.
- App draws pieces in the game's colours with studs and SVG lookalike icons (key+gem, rocket, battery,
  padlock+chains, crate badge).

## Level 219 notes (detection)
- Grid finder: seam samples with crate/frame on both sides are skipped (big crates favoured a coarse
  lattice). A lattice with twice the count also wins (score ≥ 40% of the base) when its extra lines show
  ≥1.4× the seam of its cells' mid-lines (+0.01), or its stud contrast (quarter points vs centre) is ≥8
  below the base's. Verified on all 14 screenshots × 7 sizes × smooth/nearest resampling.
- Exit strips on inner edges: a cell whose near part (0.2–0.5 cell from an open neighbour) is a piece
  colour and whose far part is background/frame is an exit facing that neighbour (orange ▶ exit where
  the board narrows); neighbouring strip cells join; the cells become walls.
- Edge exits need <4 background/frame samples (orange debris flying past read as a red exit).
- Crate badges on a cell border/corner split crates: unread fragments look for their number at edge
  midpoints and corners; every fragment touching the badge joins.
- Icon cells averaging to frame take the colour covering ≥20 samples if ≥2 corners show that family.
- Level 219 → 8×12, crates 8 / 12 / 17, orange inner-edge exit, 7 frozen exits; 22 moves, 4 out.
