# Coaching System

**Status:** Done (Session 4 — 2026-06-23), tactic engine expanded (Session 5 — 2026-06-23)

See `docs/architecture.md` for full design rationale and lessons learned.

---

## Hint button

Silent step-through. Each press reveals the next unplaced cat on the grid in row order — no text, no explanation, no Apply/Cancel. For users who just want to move forward without thinking about rules.

`runHint()` in `app.js` — finds the lowest-numbered unplaced row, calls `revealedRows.add(r)`, done.

---

## Explain button

Progressive coaching. Each press runs the tactic engine against the current board state and returns one logical deduction:

- One-sentence explanation of the rule that applies
- Visual cell highlights (gold pulse = target cat, amber glow = region candidates, red border = cells being crossed out)
- **Apply** button — executes the deduction (places the cat or writes X marks)
- **Cancel** button — dismisses without changing the board

Pressing Explain again after Apply or Cancel gives the next deduction on the updated board. The chain continues until the puzzle is solved.

### State used by Explain

| Field | Type | Purpose |
|---|---|---|
| `state.revealedRows` | `Set<number>` | Rows whose cats are visible |
| `state.xMarks` | `boolean[row][col]` | X-marked cells (imported + user-applied via Apply) |
| `state.hintCells` | `[{row,col,role}]` | Cells highlighted by the active deduction |
| `state.pendingAction` | `object \| null` | What Apply will execute |
| `state.importedCats` | `[{row,col}]` | Cats detected from screenshot (always shown) |

### Tactic engine (`generateHintText` in `app.js`)

Scans board state and returns the simplest applicable deduction as `{text, cells, action}`. Tactics fire in priority order — simplest first, forward-checking last.

| # | Tactic | What it detects | Action |
|---|---|---|---|
| 1 | **Forced region** | Region has exactly 1 valid cell | Place cat |
| 2 | **Forced row** | Row has exactly 1 valid column | Place cat |
| 3 | **Forced column** | Column has exactly 1 valid row | Place cat |
| 4 | **Region→row confinement + Vector Isolation** | All valid region cells in one row → cross out region cells outside that row AND other colors' cells in that row | X marks |
| 5 | **Region→col confinement + Vector Isolation** | Same, for columns | X marks |
| 6 | **Set Saturation, rows K=2..4** | K regions confined to same K rows → cross out other colors in those rows (generalizes naked pair) | X marks |
| 7 | **Set Saturation, cols K=2..4** | Same, for columns | X marks |
| 8 | **Line-Segment Halo** | Region valid cells form a contiguous 2–3 cell segment → cross out cells king-adjacent to the whole segment | X marks |
| 9 | **Diagonal Pinch** | Region down to exactly 2 diagonally-adjacent cells → cross out cells orthogonally adjacent to both | X marks |
| 10 | **Conjugate Pair** | Row, column, or region down to 2 candidates → cross out cells king-adjacent to both | X marks |
| 11 | **Forward-check contradiction** | Simulates each valid cell; if placement leaves any row/col/region at 0 valid cells, it's a contradiction → cross it out | X marks |
| — | **Fallback** | No rule found → solver answer with honest disclaimer | Place cat |

`isValid(r, c)` checks: row unplaced · cell colored · column unused · color unused · not X-marked · no king-move clash.

### Reference: original Meowdoku app

These screenshots show the original app's Explain-equivalent — the design we're matching.

| Screenshot | Rule shown |
|---|---|
| ![excludes region](../assets/original-hint-excludes-region.png) | "Placing here excludes all cells in Dark Blue region — no cat can be placed" |
| ![naked quad](../assets/original-hint-naked-quad.png) | "4 colors share 4 rows — exclude other cells in these 4 rows" |
| ![contradiction](../assets/original-hint-contradiction.png) | "Placing here causes a contradiction — exclude this cell" |
| ![column no valid](../assets/original-hint-column-no-valid.png) | "Column 6 will have no valid cell for a cat" |
| ![incorrect mark](../assets/original-hint-incorrect-mark.png) | "You've incorrectly marked this cell! Tap to remove the X mark" |

Key principle from the original: text is always a **reason** (why), never just a destination (where).

`docs/assets/our-explain-fallback-example.png` shows the old state before the tactic engine was built — "Place the Red 10 cat at row 1, col 7." with no reasoning. The 11-tactic engine now handles all the cases shown above; the fallback only fires when none of them apply.

---

## Key files

- `app.js` — `generateHintText()`, `runHint()`, `runExplain()`, `runApply()`, `showHint()`, `clearHint()`
- `style.css` — `.hint-box`, `.hint-actions`, `.btn-apply`, `@keyframes hintpulse`, `.cell.hint-cat/region/locked`
- `index.html` — `#hint-box`, `#hint-actions`, `#apply-btn`, `#cancel-btn`, `#hint-btn`, `#explain-btn`

---

## Future work

- **Explain progress indicator** — show how many deductions remain / solve progress
- **Undo** — un-apply an Explain step; Ctrl+Z on desktop, gesture on mobile
