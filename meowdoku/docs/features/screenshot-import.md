# Screenshot Import

**Status:** Done (Session 2), substantially hardened (Session 3 — 2026-06-19), k-means++ clustering + imported-cat detection (Session 4 — 2026-06-23), detection accuracy pass (Session 5 — 2026-07-18)

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

## Session 4 additions (2026-06-23)

1. **k-means++ clustering** replaced greedy nearest-neighbor merging — the greedy approach produced wildly wrong cluster counts on 12-color puzzles (9 instead of 12) by merging visually-similar-but-distinct colors. K-means++ always returns exactly N clusters: seed 1 = most-saturated pixel, subsequent seeds = farthest from existing centers, 25 iterations of assign + recompute.
2. **Imported cat detection** — `_extractGrid` now also detects cells with an already-placed cat emoji (originally: dark pixels below background brightness) and returns them as `cats`; shown permanently on the grid via `state.importedCats`.

## Session 5 detection-accuracy pass (2026-07-18)

Real screenshots kept exposing detector edge cases; each was root-caused against actual sampled pixels (not guessed) before fixing:

1. **Color naming showed every region as "Red"** — `approxColorName` only parsed `#rrggbb` hex, but `customColors` are stored as `"rgb(r,g,b)"` strings from clustering. Parsing failed silently, hue defaulted to 0, and every color named "Red". Fixed by parsing both `rgb(...)` and `#hex` forms. Also raised the brown lightness cutoff (0.4→0.52) so muted browns stop reading as "Orange".
2. **Cat detection missed cats, then over-fired on dark tiles** — the original sparse 3×3 sample often missed a cat's dark fur between sample points. Switched to a dense 9×9 sample counting near-black pixels. First attempt used an absolute brightness threshold (<95) which was *too loose* — a dark forest-green tile (~97 brightness) got misdetected as a cat, flooding one color region with ~10 phantom cats. Tightened to <60 (true black — cat outlines/eyes are ~10–40, tile colors never go that dark) with a minimum-hit-count of 6. Verified on three real boards (2, 5, 6 cats): all found, zero false positives both before and after the tile-color fix.
3. **Grid-size misdetection on heavily X-marked boards** — `_detectGridSize`'s tile-band threshold (0.4) was too high: a heavily X-marked row's colorful-fraction can dip to ~0.29 (white X strokes aren't "colorful"), which the detector mistook for an inter-tile gap, fragmenting one row into several bands and disagreeing with the column count. An 8×8 board was misread as 10×10 this way. Lowered the threshold to 0.2 — real gaps read as ~0.0, giving a wide safety margin. Verified on an 8×8 and two 10×10 boards.
4. **X-mark detection missed marks on light backgrounds (e.g. pink)** — `isWhiteX` required the glyph to be brighter than the cell's *own* background by a fixed +35. That margin collapses when the background itself is already bright: pink measured ~175 background brightness against a ~210-bright glyph, leaving barely 35 of headroom before antialiasing noise tips a sample under threshold — versus 65+ of headroom on a dark color like brown. Replaced with a desaturation test (`min(r,g,b) > 195 && max−min < 30`) that checks "is this near-white/gray" directly, independent of the background's own brightness. Verified against real sampled pixels (several colors including pink) plus a synthetic sweep across the palette's hue range.
5. **Manual correction tools added** — since none of the above will ever be 100% reliable on arbitrary screenshots, added a 🐱 cat-mode and an ✕ X-mark-mode swatch to the palette (alongside the eraser). Tap to place/remove a cat or an X mark by hand on any cell, for whatever the importer still gets wrong.

## Open questions / future work

- Size detection requires cols == rows agreement; if a screenshot's gaps are ambiguous it falls back to the slider value.
- Color clustering can still over/under-split very similar regions → user can repaint misdetected cells.
- **Imported cats aren't validated against the puzzle rules** — `handleImageResult` trusts whatever `result.cats` returns; a future detection glitch could still place several conflicting cats (same row/column/color, or touching) with nothing catching it before the board renders. See the "Validate imported cats" item in `TASKS.md`.
- Gemini occasionally merges/splits regions on clean screenshots — kept as opt-in only.
