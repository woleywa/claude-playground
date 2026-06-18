# Hint System

**Status:** Done (Session 2 — 2026-06-19)

## What it does

"Hint" button reveals one cat placement at a time with a rule-based explanation of why other columns are invalid. "Solve 🐱" reveals all at once. Pressing Hint after all are shown resets to zero.

## State

- `state.solution`: full `placed[row] = col` array (computed once on first Hint/Solve click)
- `state.revealed`: how many rows' cats are currently shown (0 = none, n = all)

## Explanation logic (`generateHintText`)

For each column `c ≠ correctCol` in the current row, categorise:
1. `usedCols.has(c)` → "col X (row Y): already taken"
2. `usedColors.has(grid[row][c])` → "col X: color already placed"
3. `Math.abs(c - prevCol) <= 1` → "col X: diagonal to cat in row Y"
4. Otherwise → "col X: no valid continuation"

## Key files

- `app.js` — `generateHintText()`, `runHint()`, `state.revealed`
- `style.css` — `.hint-box`, `.hint-box.visible`
- `index.html` — `#hint-box`, `#hint-btn`

## Future work

- "No valid continuation" could be improved with one-level forward checking to name the specific constraint that fails
- Step counter could show progress more visually (e.g. progress dots)
