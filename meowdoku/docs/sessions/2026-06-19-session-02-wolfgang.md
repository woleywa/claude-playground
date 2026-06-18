# Session 02 — 2026-06-19 — Wolfgang

## Completed

**Screenshot import (`image.js` — new file)**
- `openImagePicker(size, onResult)`: triggers file input, loads image, shows modal
- Auto-detection: scans scaled canvas for "colorful" pixels (HSL saturation > 0.18, lightness 0.25–0.88), skips top 28% + bottom 15% (UI chrome). Returns bounding box.
- Preview: draws red dashed rectangle + faint grid lines over detected area
- Manual fallback: two-tap mode (top-left corner, bottom-right corner) if auto-detect is wrong or user wants to adjust
- Color extraction: samples 4 off-center points per cell at 22%/78% positions (avoids X-mark and cat-face at center). Computes median RGB from 4 samples.
- Color clustering: greedy nearest-centroid with Euclidean distance threshold 50. Updates centroid incrementally. Returns `{grid, colors, colorCount}`.
- Returns actual RGB strings from screenshot as `colors[]` — used for cell display and palette swatches instead of default COLORS palette.

**Hint system (app.js)**
- `state.revealed`: how many rows' cats are currently shown (0 = none, n = all)
- "Hint" button: calls `ensureSolution()` (runs solver on first call), increments `revealed`, shows `generateHintText(step)`
- `generateHintText(step)`: for each eliminated column, categorises reason: (1) column already taken (shows which row), (2) color already placed, (3) diagonal to previous cat, (4) no valid continuation
- After all hints shown, pressing Hint again resets `revealed = 0`
- "Solve 🐱" button: sets `revealed = state.size` (all at once)
- `clearHint()` / `showHint()`: toggle `.hint-box.visible`

**GitHub Pages deployment**
- `.github/workflows/deploy.yml`: on push to main (or manual trigger), uploads `meowdoku/` folder as Pages artifact → deploys to `https://woleywa.github.io/claude-playground/`
- Repo: `woleywa/claude-playground` (public) — had to use this name because `Playground` was taken
- The `meowdoku/` folder content becomes the Pages root (no `/meowdoku/` in URL)

**Modal fix**
- Changed `overflow: hidden` → `overflow-y: auto` on `.img-modal-content`
- Reduced canvas max height from 62vh → 52vh so status + buttons always visible
- Added `flex-shrink: 1; min-height: 0` on `#img-canvas`

## Open / next priorities

1. **Preset puzzles** — 2–3 encoded examples, "Load Example" button (`docs/tasks/preset-puzzles.md`)
2. **Multiple-solution detection** — warn if puzzle is ambiguous
3. **Disconnected-region warning** — warn if a color region has disconnected parts
4. **Undo** — paint history

## Files changed

- `image.js` (new)
- `app.js` (major: revealed/customColors state, hint logic, photo button handler, cellColor helper)
- `index.html` (photo btn, hint btn, hint-box div, modal HTML, `<script src="image.js">`)
- `style.css` (hint-box styles, modal styles, btn-hint, overflow fix)
- `.github/workflows/deploy.yml` (new)

## Key decisions

See `docs/decisions.md` — D-4 (colorful-pixel auto-detect), D-5 (rule-based hints), D-6 (public repo).

## Codebase reminders

- `state.customColors`: array of `rgb(r,g,b)` strings from screenshot. When set, `cellColor(idx)` returns these instead of the default `COLORS[]` palette. `renderPalette()` also uses them for swatch colors.
- `state.revealed` vs `state.solution`: solution holds the full answer; revealed controls how many cats show. Set revealed = size for "solve all", increment for hints, reset to 0 on repaint.
- `openImagePicker` in image.js binds click/touchstart to the canvas on open and removes them on close — important not to double-bind.
- The GH Actions workflow uploads `meowdoku/` as the artifact root, so `index.html` lands at the site root (not under `/meowdoku/`).
- Color clustering threshold is 50 (RGB Euclidean). If two distinct regions sample very similar colors (unusual), they'd merge into one cluster and the solver would fail. User can repaint misdetected cells.
