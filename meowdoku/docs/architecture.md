# Meowdoku Solver — Architecture

Living design document. Updated each session. Records design intent, key decisions, and lessons learned — the "why" layer that session logs and ADRs don't fully capture.

---

## What the app is trying to do

Meowdoku / LinkedIn Queens puzzles give you a colored grid and ask you to place exactly one cat per row, per column, and per color region, with no two cats touching (including diagonally). The app has three jobs:

1. **Grid editor** — let the user paint the puzzle's color regions by hand or import them from a screenshot.
2. **Solver** — compute the unique solution instantly.
3. **Coach** — help the user solve it themselves through progressive hints.

The coaching job is the most interesting and the most difficult to get right.

---

## The Hint / Explain system

### What we're trying to do

The goal of coaching is to teach, not to spoil. The original Meowdoku app does this well: instead of just saying "put a cat here", it shows *why* — which rule applies, which cells are affected — and then lets the user choose to apply it or not.

Reference screenshots from the original app (stored in `docs/assets/`):

- `original-hint-excludes-region.png` — "Placing here excludes all cells in Dark Blue region — no cat can be placed"
- `original-hint-naked-quad.png` — "4 colors share 4 rows — exclude other cells in these 4 rows"
- `original-hint-contradiction.png` — "Placing here causes a contradiction — exclude this cell" (forward-checking)
- `original-hint-column-no-valid.png` — "Column 6 will have no valid cell for a cat" (column candidate elimination)
- `original-hint-incorrect-mark.png` — "You've incorrectly marked this cell! Tap to remove the X mark"
- `our-explain-fallback-example.png` — our current fallback output: "Place the Red 10 cat at row 1, col 7." (no reasoning given — known quality gap)

Two buttons:

- **Hint** — silent, for when the user just wants to move forward. Reveals the next cat without any explanation.
- **Explain** — educational coaching. Each press gives one deduction: a one-sentence rule + visual cell highlights + an Apply button. Pressing Apply executes the deduction (marks X cells or places the cat). Pressing Explain again gives the *next* deduction on the updated board.

The key principle: **Explain never reveals an answer directly**. It shows a logical step. The user decides whether to apply it.

### Tactic detection hierarchy

`generateHintText()` scans the current board and returns the *simplest* applicable deduction, checked in human-difficulty order. Each tactic block records itself in a `checked` trail (`noteChecked()`) if its full scan finds nothing, so the returned hint can show a dimmed, struck-through "Checked first, no luck: …" line above the lesson — teaching the *order* to check things in, not just the answer for this board. See `docs/features/coaching-system.md` for the full per-tactic table; summarized here:

1. **Last Spot** (region / row / column) — down to exactly 1 valid cell → place the cat
2. **Line Lock**, forward (row / column) — all of a color's valid cells fall in one line → cross that color's other cells *and* other colors' cells on that line
3. **Line Lock**, reverse (row / column) — all of a *line's* valid cells are one color → that color's cat is in this line → cross that color out everywhere else, even where it still has other candidates
4. **Crowding**, naked (rows/cols, K=2..4) — K colors confined to the same K lines → cross other colors out of those lines ("naked pair/triple/quad")
5. **Crowding**, hidden (rows/cols, K=2..4) — K lines can only be reached by K colors combined → those colors must place inside those lines (dual of naked Crowding — "hidden pair/triple/quad")
6. **Shared Shadow** — any unit (region/row/column), any candidate count ≥2: if *every* candidate would eliminate some other cell (via shared row, column, color, or king-move touch), that cell is dead regardless of which candidate wins. Generalizes the original fixed-shape "line segment / diagonal pinch / conjugate pair" tactics — same idea, no cap on candidate count
7. **Team Shadow** — two units together: every consistent pairing of a candidate from unit A with one from unit B eliminates the same cell (including the case where a cell shared by both units' candidate lists would satisfy both at once) → dead no matter how A and B resolve
8. **What-If** — hypothesize a cat on an open cell, propagate every forced follow-up; if the chain empties a row/column/region, that cell is impossible. Every open cell is tested each pass, but only the dead end with the *shortest* forced chain is shown — the chain drawn as dashed "ghost" cats, reasoning spelled out line by line — with an **Apply All** button to clear every dead end found that pass at once
9. **Beyond the Rules** (fallback) — no technique resolved it → the solver's answer with an honest disclaimer

Earlier tactics are simpler and more satisfying to learn; What-If is the last resort before the fallback.

**Why the roster grew from 6 tactics to this:** a Hard reference level (840) originally leaned on What-If for 69 cells across 3 opaque, dozens-of-cells-at-once batches — a sign that explainable human techniques were missing, not that the puzzle genuinely needed brute-force contradiction testing. Adding Line Lock (reverse), Crowding (hidden), generalizing the old Squeeze into Shared Shadow, and adding Team Shadow progressively shrank What-If's share of the solve, verified on every hard reference board tested (levels 840 and 1130).

**Why a "No Room" tactic was proposed, then rejected:** the obvious next addition seemed to be a dedicated tactic for "if a cat lands here, some other unit is immediately stranded" — a depth-1 What-If. Testing showed this is *always* already covered by what runs before What-If: if the stranded unit has exactly 1 candidate, Last Spot places it first; if it has 2+, Shared Shadow already crosses the hypothesis cell out (the "blocks" relation Shared Shadow tests — same row/column/color, or touching — is symmetric, so "placing here would empty unit G" and "every one of G's remaining cells blocks this spot" are the same statement). Verified across ~47,000 simulated positions: zero cases where a dedicated No Room tactic would have fired and wasn't already caught. Correctly left out rather than built.

**Why Team Shadow needed a same-cell branch to be sound:** the first implementation only considered pairs of *distinct* candidates, one from each unit — but when the two units share a candidate cell (a cell that belongs to both unit A's and unit B's remaining candidates), a single cat there satisfies both units at once, and that's not a "pair" of two placements at all. Missing this branch made the tactic cross out a cell that was the puzzle's actual solution. Caught before shipping by checking every elimination against a board with a known unique solution — a regression habit that paid for itself repeatedly this session.

### How Apply / Apply All work

The action carried by each tactic:

| Tactic | Action type | What Apply does |
|---|---|---|
| Last Spot | `cat` | `revealedRows.add(row)` → cat appears; `markCatEliminations()` auto-X's its row, column, color region, and 8 touching cells |
| Line Lock / Crowding / Shared Shadow / Team Shadow | `xmarks` | Marks the specific cells found |
| What-If | `xmarks` | Marks only the ONE dead end shown (the shallowest chain) |
| Beyond the Rules (fallback) | `cat` | Places the solver's next cat |

What-If additionally returns `allAction` — an `xmarks` action covering *every* dead end found that pass, not just the one shown. The **Apply All** button executes it via `runApplyAll()` / `state.pendingAllAction`, for once the player has the pattern and wants to clear the rest in one tap instead of clicking through each dead end.

After Apply or Apply All, the hint clears and the board is updated. The next Explain call sees the new state (including any X marks just applied) and finds a fresh deduction.

### Why `revealedRows` is a Set, not a counter

The original `state.revealed: number` showed cats for rows `0..revealed-1` — strictly sequential. This worked for the Hint button (always reveal next row in order) but broke the Explain/Apply flow.

Explain's tactic engine might identify a forced placement at row 7 before rows 3, 4, 5 are placed. If Apply increments a counter, you'd get the wrong cat (row 3 instead of row 7). With `revealedRows: Set<number>`, Apply does `revealedRows.add(7)` and only that cat appears.

The Hint button still steps sequentially — it just finds the lowest-numbered unplaced row and adds it.

### Why `xMarks` is shared between imported and user-applied marks

`state.xMarks` originally only held X marks detected in the screenshot (cells the player had already excluded in the real game). After the Explain/Apply flow, user-applied X marks from tactic deductions land in the same array.

This is intentional: the tactic engine's `isValid()` checks `xMarks`, so each Apply narrows the search space for the next Explain. The two sources of X marks are indistinguishable on the board, which is correct — both represent "no cat here".

### What `isValid` checks

```
isValid(r, c):
  - row r is not already placed (revealedRows or importedCats)
  - cell color is ≥ 0 (colored)
  - column c is not already used
  - color region is not already placed
  - cell is not marked X (xMarks)
  - no adjacency conflict with placed cats
```

All six conditions must pass. Missing the `xMarks` check was a bug in earlier versions — applied X marks were ignored by the tactic engine, causing Explain to suggest the same deduction twice.

---

## Screenshot import pipeline

The user takes a phone screenshot of the LinkedIn/Meowdoku app and imports it. The pipeline:

1. **`_autoDetect`** — finds the bounding box of colorful pixels (HSL saturation > 0.18, lightness 0.25–0.88), skipping top 28% and bottom 15% of image (header/ads). Then **square-clamps** to the shorter side anchored at top-left.

   *Why square-clamp:* the game's action buttons below the grid are colorful and inflated the bounding box height ~23%, causing every lower row to sample into empty cream background. The puzzle is always square; square-clamping recovers the true grid.

2. **`_detectGridSize`** — counts "tile bands" along columns and rows by looking for dips in the colorful-fraction profile (tile gaps appear as non-colorful). N = band count when rows and columns agree and fall in 5..12. Band threshold is **0.2**, not the original 0.4 — a heavily X-marked row's colorful fraction can dip to ~0.29 (white X strokes aren't "colorful"), which the higher threshold mistook for a gap, fragmenting rows and misreading an 8×8 board as 10×10. Real gaps read ~0.0, so 0.2 gives a wide margin.

3. **`_extractGrid`** — samples a 5×5 point grid per cell for color, takes the median RGB, and records the dominant color per cell. Returns `grid[row][col] = colorIndex` plus:
   - **`cats`** — cells with an already-placed cat emoji, detected via a dense 9×9 sample counting genuinely near-black pixels (`<60` brightness, ≥6 hits). Cat fur/eyes/outline are true black (~10–40); no tile color gets that dark, so this doesn't false-positive on dark tiles the way an earlier, looser threshold (`<95`) did.
   - **`xMarks`** — cells with a white or red X overlay. White-X detection is a **desaturation** test (`min(r,g,b) > 195 && max−min < 30`) — "is this pixel near-white/gray" — rather than "brighter than this cell's own background by a fixed amount", which fails on already-bright backgrounds like pink (see `docs/features/screenshot-import.md` for the full writeup).

4. **`_cluster`** — k-means++ clustering with exactly N clusters (guaranteed). Seed 1 = most-saturated pixel; subsequent seeds = farthest from existing centers. 25 iterations of assign + recompute.

   *Why k-means++ instead of greedy nearest-neighbor:* the greedy approach (merge closest pair until N clusters) produced wildly wrong results on 12-color puzzles (9 clusters instead of 12), because it merged visually similar but distinct colors. K-means++ always produces exactly N clusters and is significantly more accurate.

   *Color naming caveat:* `customColors` from this pipeline are `"rgb(r,g,b)"` strings, not `#hex` — `approxColorName()` must parse both forms, or every imported region silently names itself "Red" (hue defaults to 0 on a parse failure). This broke silently for a while because the failure mode looks like a plausible bug report ("why is everything red?") rather than an obvious crash.

None of the above is ever fully reliable on an arbitrary phone screenshot — a 🐱 cat-mode and an ✕ X-mark-mode swatch in the palette let the player hand-correct whatever the importer still gets wrong, rather than chasing 100% detection accuracy.

---

## Lessons learned

### Merge conflicts from parallel branch development

The session environment assigns a feature branch (`claude/meowdoku-*`). This project uses direct-to-main. When the session tried to merge the feature branch back to main, conflict resolution chose the wrong version — the feature branch was based on an older state than main, so "taking theirs" lost all session work.

**Lesson:** When the feature branch is older than main, the correct resolution is to take `origin/main` content for all files (`git checkout origin/main -- <files>`) after switching to the feature branch, then re-apply the new changes on top.

### Edit tool failures from stale string matching

The Edit tool requires `old_string` to match the file exactly. When earlier edits in the same session modified a function, subsequent edits targeting the original text failed silently with "string not found". This caused several functions to be left in a half-edited state across sessions.

**Lesson:** After any edit to a function, re-read the file before making a second edit to the same area. Never rely on memory of what the file contains.

### Missing infrastructure after merge

After merging the feature branch, the hint overlay system (CSS animations, `hintCells` in state, `renderGrid` class application) was silently absent from the deployed files. The code called `showHint(text, cells)` correctly, but `showHint` ignored the `cells` argument because the infrastructure edits had been lost.

**Lesson:** After any merge, verify that all pieces of a multi-file feature are present: state field, function signature, DOM application, and CSS class. A function that calls `showHint(text, cells)` where `showHint` ignores `cells` fails silently.

### Progressive feature design requires clear state ownership

The Explain/Apply flow involves three layers of state that interact:
- `revealedRows` (which cats are visible)
- `xMarks` (which cells are excluded)
- `pendingAction` (what the next Apply will do)
- `hintCells` (what's highlighted right now)

Getting the clearing logic right — what clears when, and in what order — required careful thinking. `clearHint()` is the single clearing point: it zeroes `hintCells`, `pendingAction`, `pendingAllAction`, hides the Apply / Apply All / Cancel buttons, and re-renders. Any reset path (size change, clear button, painting after solve) goes through `clearHint()`.

### Verify new tactics against the real engine, not a hand-written mirror (Session 5)

Prototyping a new tactic (Team Shadow, the Shared Shadow generalization, the What-If redesign) started each time as a standalone Node script — a from-scratch reimplementation of the relevant logic, run against generated or reconstructed puzzles. That's fast for iterating on an idea, but it isn't proof the *actual* `app.js` code works: a mirror can silently diverge from the real file (miss a field on the returned hint object, use a different role name for a highlighted cell, forget to thread `xMarks` through a helper), and none of that shows up when the mirror is the only thing being tested.

**Lesson:** once a new tactic's logic is validated in a prototype, load the real `app.js` (plus `solver.js`) into a Node `vm` sandbox with a minimal `document`/`window` stub and call `generateHintText()` directly. This caught real integration gaps more than once — e.g. a new tactic's return object missing the `checked` field, or `requestAnimationFrame`/`classList.toggle` not existing in the stub (harmless in a browser, a hard crash in the test harness, and a useful signal that the stub itself needed to grow). The regression bar for "does the redesign work" is the real file solving real boards soundly — not the prototype.

### Reconstructing a puzzle from a screenshot for debugging must be verified, not assumed (Session 5)

Several tactic-engine questions this session ("is What-If really necessary here?", "is there a simpler rule we're missing?") could only be answered by reconstructing the *exact* board from a user-supplied screenshot and running the real engine against it. A first reconstruction attempt, from a small and heavily X-marked screenshot, produced a region map that looked plausible but wasn't: it failed a connectivity check (a color's cells weren't all orthogonally connected) and had 3 solutions instead of 1. Rather than debug conclusions drawn from that board, the reconstruction was discarded and redone from a cleaner screenshot the user provided, which passed both checks.

**Lesson:** any screenshot-reconstructed puzzle used for debugging or testing must pass two checks before it's treated as ground truth: every color region is orthogonally connected, and the puzzle has *exactly* one solution (brute-force search, capped at 2–3 to confirm uniqueness cheaply). Skipping this and reasoning from a broken reconstruction would have produced confident-sounding but wrong conclusions.

### OS multitasking screenshots aren't a substitute for a clean one (Session 5)

A user screenshot showing our app's misdetection compared two overlapping app cards (an OS app-switcher view) rather than one full screenshot. Attempting to replay the real detection algorithm against it (`_autoDetect`'s colorful-pixel bounding box) produced nonsensical per-cell geometry, because `_autoDetect` assumes it can see the *entire* square grid — here, only about 3 of 10 columns were visible (the rest sat behind the other app card), so the box it found was far too small and every downstream sample was misaligned.

**Lesson:** recognize when an input breaks a load-bearing assumption of the algorithm being tested (here: "the grid is fully visible and square") and say so, rather than presenting numbers computed from a broken premise as if they were meaningful. The useful signal was still extractable from that screenshot — visually comparing the two apps' rendered grids cell-by-cell — it just couldn't come from re-running the auto-detect math on a partial view.
