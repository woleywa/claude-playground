# Screenshot Import

**Status:** Done (Session 2), substantially hardened (Session 3 — 2026-06-19)

## What it does

Lets the user upload a screenshot from the game. The app detects the grid automatically, samples each cell's color, clusters into N color groups, and populates the grid painter — ready to solve or hint.

## Implementation steps (completed)

1. File picker → FileReader → `<Image>` element
2. Scale image to fit modal (~52vh tall max, 480px wide max)
3. Auto-detect: scan scaled canvas for colorful pixels, bounding box
4. Show preview with red dashed overlay + faint grid lines
5. Manual fallback: two-tap (top-left, bottom-right)
6. On confirm: sample 4 off-center points per cell (22%/78%), compute median RGB
7. Greedy nearest-centroid clustering (RGB Euclidean threshold 50)
8. Return `{grid, colors, colorCount}` to app.js

## Key files

- `image.js` — all logic
- `app.js` — `handlePhoto` in `bindEvents()`, `state.customColors`

## Session 3 hardening (2026-06-19)

Real screenshots exposed several failures; fixed and verified with a Python+Pillow harness replaying the JS sampling:

1. **Square-clamp bounds** — action buttons below the grid inflated the bounding box height ~23%, stretching the sample grid into empty background. Now clamped to the shorter side, anchored top-left.
2. **Grid-size auto-detection** (`_detectGridSize`) — N is read from the tile gaps (colorful-fraction band count over cols & rows) instead of the slider, so 9×9 puzzles are no longer sliced as 10×10.
3. **X-mark stripping** — `_medRGB` discards near-white (>210 all channels) pixels before the median; sampling upgraded to a 5×5 grid per cell.
4. **Clustering** — threshold 50→60, post-merge of clusters <40 apart, then force-merge down to exactly N.
5. **Clipboard paste** — 📋 button + global Ctrl/Cmd+V.
6. **Optional AI path** — 🤖 Gemini button (key in localStorage); pixel sampling stays the default (tested more accurate). See `docs/decisions.md`.

Pipeline order now: `_autoDetect` → `_detectGridSize` → `_extractGrid` → `_cluster`.

## Open questions / future work

- Size detection requires cols == rows agreement; if a screenshot's gaps are ambiguous it falls back to the slider value.
- Color clustering can still over/under-split very similar regions → user can repaint misdetected cells.
- Could detect already-placed cats from the screenshot and pre-populate `state.revealed`.
- Gemini occasionally merges/splits regions on clean screenshots — kept as opt-in only.
