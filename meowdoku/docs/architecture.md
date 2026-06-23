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

Two buttons:

- **Hint** — silent, for when the user just wants to move forward. Reveals the next cat without any explanation.
- **Explain** — educational coaching. Each press gives one deduction: a one-sentence rule + visual cell highlights + an Apply button. Pressing Apply executes the deduction (marks X cells or places the cat). Pressing Explain again gives the *next* deduction on the updated board.

The key principle: **Explain never reveals an answer directly**. It shows a logical step. The user decides whether to apply it.

### Tactic detection hierarchy

`generateHintText()` scans the current board and returns the *simplest* applicable deduction. Priority order:

1. **Forced region** — a color region has only one valid cell left → place the cat there
2. **Forced row** — a row has only one valid column → place the cat there
3. **Region confined to one row** — all valid cells for a color fall in the same row → mark the rest of the region as X
4. **Region confined to one column** — same, vertically → mark the rest of the region as X
5. **Naked pair** — two colors are each confined to the same two rows → mark other colors X in those rows
6. **Fallback** — no elegant rule found → suggest the next solution step directly

Earlier tactics are simpler and more satisfying to learn. The fallback is a last resort.

### How Apply works

The action carried by each tactic:

| Tactic | Action type | What Apply does |
|---|---|---|
| Forced region / row | `cat` | `revealedRows.add(row)` → cat appears |
| Region confined to row/col | `xmarks` | Marks specific cells in `state.xMarks` |
| Naked pair | `xmarks` | Marks other-color cells in the two rows |
| Fallback | `cat` | Places the next solution cat |

After Apply, the hint clears and the board is updated. The next Explain call sees the new state (including any X marks just applied) and finds a fresh deduction.

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

2. **`_detectGridSize`** — counts "tile bands" along columns and rows by looking for dips in the colorful-fraction profile (tile gaps appear as non-colorful). N = band count when rows and columns agree and fall in 5..12.

3. **`_extractGrid`** — samples a 5×5 point grid per cell, takes the median RGB, strips near-white pixels (X-mark overlay), and records the dominant color per cell. Returns `grid[row][col] = colorIndex` plus detected `cats` (dark-pixel cells = already-placed cats).

4. **`_cluster`** — k-means++ clustering with exactly N clusters (guaranteed). Seed 1 = most-saturated pixel; subsequent seeds = farthest from existing centers. 25 iterations of assign + recompute.

   *Why k-means++ instead of greedy nearest-neighbor:* the greedy approach (merge closest pair until N clusters) produced wildly wrong results on 12-color puzzles (9 clusters instead of 12), because it merged visually similar but distinct colors. K-means++ always produces exactly N clusters and is significantly more accurate.

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

Getting the clearing logic right — what clears when, and in what order — required careful thinking. `clearHint()` is the single clearing point: it zeroes `hintCells`, `pendingAction`, hides the Apply/Cancel buttons, and re-renders. Any reset path (size change, clear button, painting after solve) goes through `clearHint()`.
