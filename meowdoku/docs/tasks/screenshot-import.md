# Screenshot Import

**Status:** Done (Session 2 — 2026-06-19)

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

## Open questions / future work

- Auto-detect fails if the screenshot has unusual aspect ratio or many colorful UI elements outside the grid
- Color clustering might over-split similar colors (threshold 50) → user can repaint misdetected cells
- Could detect already-placed cats from the screenshot and pre-populate `state.revealed`
