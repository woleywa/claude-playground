# Coaching System

**Status:** Done (Session 4 — 2026-06-23), tactic engine expanded (Session 5 — 2026-06-23), rewritten as named lessons + reverse/hidden/generalized techniques + checked-trail + Team Shadow + one-dead-end-at-a-time What-If with Apply All (Session 6)

See `docs/architecture.md` for full design rationale and lessons learned.

---

## Hint button

Silent step-through. Each press reveals the next unplaced cat on the grid in row order — no text, no explanation, no Apply/Cancel. For users who just want to move forward without thinking about rules.

`runHint()` in `app.js` — finds the lowest-numbered unplaced row, calls `revealedRows.add(r)`, done.

---

## Explain button

Progressive coaching. Each press runs the tactic engine against the current board state and returns one lesson, taught the same way every time — **Name** (the technique) → **Rule** (the general principle) → **Here** (how it applies right now):

- A dimmed, struck-through **checked trail** above the name — e.g. "Checked first, no luck: Last Spot → Line Lock → Crowding" — showing which simpler techniques were tried and found nothing, so the player learns the checking order, not just the answer
- Bold technique name with emoji (🎯 Last Spot, 📏 Line Lock, 👥 Crowding, 🤏 Shared Shadow, 🤝 Team Shadow, 🤔 What-If)
- The general rule, in plain language — this is the part meant to transfer to the next puzzle
- The specific application to the current board, coordinates last
- For What-If only: a **chain trace** — one line per forced placement leading to the contradiction, plus a closing line naming what runs out of room, so the reasoning is followable instead of just asserted
- Visual cell highlights: gold pulse = target cat, amber glow = region candidates, red pulse = cells being crossed out, **dashed blue pulse = hypothetical cats in a What-If chain** (distinct from a real cat placement — it's an "if", not a "do this")
- **Apply** button — executes the deduction (places the cat or writes X marks)
- **Apply All** button (What-If only, shown when more than one dead end was found) — crosses out every dead end from this pass at once, for when the player has the pattern and wants to skip ahead
- **Cancel** button — dismisses without changing the board

Pressing Explain again after Apply, Apply All, or Cancel gives the next lesson on the updated board. The chain continues until the puzzle is solved.

### State used by Explain

| Field | Type | Purpose |
|---|---|---|
| `state.revealedRows` | `Set<number>` | Rows whose cats are visible |
| `state.xMarks` | `boolean[row][col]` | X-marked cells (imported + user-applied via Apply) |
| `state.hintCells` | `[{row,col,role}]` | Cells highlighted by the active deduction (`role` includes `cat`, `region`, `locked`, and `ghost` for What-If chain steps) |
| `state.pendingAction` | `object \| null` | What Apply will execute |
| `state.pendingAllAction` | `object \| null` | What-If only: what Apply All will execute (every dead end found this pass) |
| `state.importedCats` | `[{row,col}]` | Cats detected from screenshot (always shown) |

### Tactic engine (`generateHintText` in `app.js`)

Scans board state and returns the simplest applicable deduction as `{name, rule, here, cells, action, checked, chainLines?, moreLine?, allAction?}`. Tactics fire in **human-difficulty order** — simplest first, What-If last — and each block records itself in a `checked` trail (via `noteChecked()`) if its full scan finds nothing, so the returned hint can show what was tried before it. Several tactics share one displayed name because they're the same *technique* applied to different shapes or directions — deliberate, so the player recognizes "this is a Crowding" regardless of which form it took.

| Technique | Covers | What it detects | Action |
|---|---|---|---|
| 🎯 **Last Spot** | region / row / column | Down to exactly 1 valid cell | Place cat |
| 📏 **Line Lock** (forward) | row, column | All of a color's valid cells fall in one line → cross that color's other cells AND other colors' cells on that line | X marks |
| 📏 **Line Lock** (reverse) | row, column | All of a *line's* valid cells are one color → that color's cat is in this line → cross that color out everywhere else, even where it still has other candidates | X marks |
| 👥 **Crowding** (naked) | rows K=2..4, cols K=2..4 | K colors confined to the same K lines → cross other colors out of those lines (generalizes "naked pair") | X marks |
| 👥 **Crowding** (hidden) | rows K=2..4, cols K=2..4 | K lines can only be reached by K colors combined (dual of naked Crowding — "hidden pair/triple/quad") → those colors must place inside those lines → cross their other cells out everywhere else | X marks |
| 🤏 **Shared Shadow** | any region / row / column, any candidate count ≥ 2 | Every remaining candidate of a unit would eliminate some other cell (via shared row, column, color, or king-move touch) → that cell is dead regardless of which candidate wins. Generalizes the old fixed-shape "line segment / diagonal pinch / conjugate pair" tactics — same idea, no cap on candidate count, and reasons about shared row/col/color too, not just touch | X marks |
| 🤝 **Team Shadow** | any 2 units (region/row/col), each ≤6 candidates | Every consistent pairing of a candidate from unit A with one from unit B eliminates the same cell — including the case where one shared cell would satisfy both units at once — so that cell is dead no matter how A and B resolve | X marks |
| 🤔 **What-If** | one open cell per press, shallowest chain first | Hypothesize a cat, propagate every forced follow-up; if the chain empties a row/column/region, that cell is impossible. Every open cell is tested against the same snapshot each pass, but only the dead end with the **shortest forced chain** is shown — with the chain drawn out as dashed "ghost" cats and the reasoning spelled out line by line. `allAction` carries every other dead end found this pass, for the **Apply All** button | X marks |
| 🧩 **Beyond the Rules** (fallback) | — | No technique resolved it → solver answer with honest disclaimer | Place cat |

`isValid(r, c)` checks: row unplaced · cell colored · column unused · color unused · not X-marked · no king-move clash.

**Why the reverse/hidden/generalized techniques were added:** a Hard level (840) leaned on What-If for 69 cells across 3 opaque batches — a sign that *explainable* human techniques were missing, not that the puzzle genuinely needed brute-force contradiction testing. Adding Line Lock (reverse), Crowding (hidden), and generalizing Squeeze into Shared Shadow (any candidate count, not just 2–3) dropped that to far less What-If reliance, with most of the puzzle resolved by nameable, teachable logic.

**Why Shared Shadow subsumes the old Squeeze:** the general test — "does every remaining candidate of this unit eliminate cell X, via shared row, column, color, or king-move touch?" — covers the old line-segment/diagonal-pinch/conjugate-pair special cases (which only checked king-move touch, capped at 2–3 candidates) as special cases, and finds strictly more: it works for any candidate count and also catches eliminations via shared row/column/color, not just physical touch.

**Why Team Shadow exists, and why it doesn't make No Room redundant:** testing showed that any *single*-unit "if a cat lands here, some other unit is immediately stranded" deduction is already fully covered by Last Spot (if the stranded unit has 1 candidate) or Shared Shadow (if it has 2+) — verified across ~47k simulated positions, zero misses. So a proposed "No Room" tactic would never fire and was dropped. But *two*-unit reasoning ("wherever Forest's cat and Row 7's cat land, together they always kill this cell") is genuinely new coverage — it fired on both hard reference boards (levels 840 and 1130) at positions nothing else touched. The overlap case (a cell that's a candidate of *both* units at once — one cat there would satisfy both) needs its own branch, since a single cat can't be "paired with itself"; missing this branch initially made the tactic unsound (it crossed out a real solution cell) until fixed.

**Why What-If shows one dead end at a time now:** batching every dead end into a single Apply (this file's Session 6 first draft) technically worked but was unfollowable in practice — one Hard level (1130) surfaced a 14-cell, then later a 32-cell batch in a single press, with no way to see *why* any individual cell died. Per-cell forced-chain depth varies enormously (as shallow as 1 forced placement, as deep as 8+), so the fix sorts all dead ends found this pass by chain length and shows only the shallowest — the most followable — with its full chain traced out. `Apply All` (via `allAction`) keeps the option to clear everything found this pass in one tap, for players who've internalized the pattern and want to move faster. Verified via live runs of the actual `app.js` engine (not a mirror) on both hard reference boards plus a 75-random-puzzle regression (sizes 5–10): 100% solved, zero unsound eliminations throughout.

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

`docs/assets/our-explain-fallback-example.png` shows the old state before the tactic engine was built — "Place the Red 10 cat at row 1, col 7." with no reasoning. The tactic engine now handles all the cases shown above; the fallback only fires when none of them apply.

---

## Key files

- `app.js` — `generateHintText()`, `runHint()`, `runExplain()`, `runApply()`, `runApplyAll()`, `showHint()`, `clearHint()`
- `style.css` — `.hint-box`, `.hint-actions`, `.btn-apply`, `.btn-apply-all`, `.hint-chain-step`, `.hint-more`, `@keyframes hintpulse`, `.cell.hint-cat/region/locked/ghost`
- `index.html` — `#hint-box`, `#hint-actions`, `#apply-btn`, `#apply-all-btn`, `#cancel-btn`, `#hint-btn`, `#explain-btn`

---

## Future work

- **Explain progress indicator** — show how many deductions remain / solve progress
- **Undo** — un-apply an Explain step; Ctrl+Z on desktop, gesture on mobile
