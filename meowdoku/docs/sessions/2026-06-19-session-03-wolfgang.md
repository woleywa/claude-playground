# Session 03 — 2026-06-19 — Wolfgang

Theme: dark-mode visual overhaul + a deep fix of screenshot color/size detection, plus an optional AI detection path.

## Completed

**Dark mode (`style.css`)** — `4cd9eb1`
- Static dark theme (no toggle): `--bg #111`, `--text #e8e4e0`, `--cell-empty #222`, white-transparent borders. Buttons, slider, hint-box, status colors, screenshot modal all re-themed for dark.

**Screenshot color-detection robustness (`image.js`)**
- 5×5 sample grid per cell + median, replacing the old 4 off-center points — robust against X-mark overlays (`67f9698`).
- `_medRGB` strips near-white pixels (all channels > 210 = X-mark overlay) before taking the median, falling back to all points only if < 30% colored remain (`a6d60d4`).
- Cluster threshold 50 → 60; added post-merge pass that collapses clusters < 40 RGB apart (`67f9698`).
- Force-merge: after clustering, repeatedly merge the closest pair until exactly N clusters remain (puzzle always has exactly N colors). Now a safety net rather than the primary mechanism (`037e33c`). Helpers `_mergePair` / `_closestPair`.

**THE key fix — square-clamp auto-detect bounds (`image.js`)** — `3e7a8e9`
- Root cause (proven with a Python harness against real screenshots): the colored action buttons *below* the grid (Apply, pencil, lightbulb) were counted as "colorful" pixels, inflating the bounding box height ~23%. The sample grid then stretched down into the empty cream background → ghost colors + every lower row shifted.
- Fix: the grid is always square, so clamp the bounding box to its shorter side, anchored at the top-left corner (clean; header/counter are above the scan band). Loosened the aspect gate to 0.6–1.7 since we square afterwards.
- Result: exactly the right N colors on the test screenshots.

**Grid-size auto-detection from tile gaps (`image.js`)** — `444d563`
- `_detectGridSize(data, iw, ih, bounds)`: within the square bounds, counts "tile bands" along columns and rows. Tiles are separated by cream gaps that read as non-colorful, so the colorful-fraction profile dips at each gap. N = band count when columns and rows agree and fall in 5..12; otherwise falls back to the slider size.
- Used in `_extractGrid` (full-res, authoritative) and `_showModal` (scaled, for the preview overlay + status text). `handleImageResult` already adopts `result.grid.length` as the size, updating slider/label.
- Verified end-to-end on real 9×9 and 10×10 screenshots (both detected correctly).

**Clipboard paste import (`image.js`, `app.js`, `index.html`)** — `a0e8c47`
- New 📋 button → `openImageFromClipboard` via `navigator.clipboard.read()`.
- Global `paste` event (Ctrl/Cmd+V on desktop) → `loadImageBlob`.
- `_loadFile` refactored to `_loadBlob` (objectURL); `_openFilePicker` extracted. Falls back to the file picker when the clipboard API is unavailable/denied.

**Tile grid redesign + X marks (`style.css`, `app.js`)** — `daabdc5`
- Grid uses `gap: 2px` + padding with rounded `.cell` corners and a drop-shadow, matching the original game's tile look.
- After solve / during hint reveal, non-cat revealed cells show a `✕` (`.cell.excluded`) with an `xpop` animation. Cat cells keep the 🐱 `catpop`.

**AI color detection (`image.js`, `app.js`, `index.html`, `style.css`)** — `3e7a8e9`
- Optional 🤖 "KI-Farberkennung" button below the grid, shown only after an import. Re-runs detection on the last imported image (`_img.img`) via Gemini (`gemini-flash-latest`, REST `generateContent`, `responseMimeType: application/json`, temp 0, image downscaled to 760px JPEG).
- API key: prompted once, stored only in `localStorage` (`gemini_api_key`), never committed. Cleared on 400/403. Retry with backoff on 500/503/429.
- Returns `{grid, colors, colorCount}` (same shape as local extraction); `handleImageResult` adopts the size.
- **Decided to keep pixel sampling as the default** — in a side-by-side test on the user's real screenshot, Gemini was slower, hit repeated 503s, and was *less* accurate (merged the rose/mauve region into pink, hallucinated an extra green region), while the fixed pixel sampling nailed all 10. AI is the optional second opinion.

**Size slider → fixed bottom bar + Solve text color (`index.html`, `style.css`)** — `4bd90cd`
- Slider moved out of `.top-controls` into a `position: fixed` `.size-bar` at the screen bottom (safe-area-inset aware). `.app` gained bottom padding so content clears the bar.
- `.btn-primary` text color `#fff` → `#111` for legibility on the light button in dark mode. **Note: user reported it still looked unchanged at end of session — likely deploy/browser cache; verify next session (see TASKS).**

## Workflow note

Per user: this project is too small for feature branches — commit and push **directly to `main`**. Recorded in `meowdoku/CLAUDE.md` and global memory.

## Open / next priorities

1. **Verify Solve-button text color** after deploy propagates; investigate if still light.
2. **Rotate the Gemini API key** — it was pasted in plaintext during this session (it never entered the repo, only localStorage).
3. Preset puzzles · Multiple-solution detection · Disconnected-region warning · Undo (carried over).

## Files changed

- `image.js` (color/size detection overhaul, clipboard, Gemini)
- `app.js` (paste + AI handlers, size adoption in `handleImageResult`, X-mark render, ai-btn show/hide)
- `index.html` (📋 + 🤖 buttons, fixed `.size-bar`)
- `style.css` (dark theme, tile grid, X-mark/AI styles, bottom bar, Solve text color)
- `CLAUDE.md` (no-feature-branch note)

## Key decisions

See `docs/decisions.md` — D-7 (square-clamp bounds), D-8 (gap-band size detection), D-9 (pixel sampling default over AI), D-10 (AI key in localStorage), D-11 (X-mark white-strip), D-12 (direct-to-main).

## Codebase reminders

- Detection pipeline order: `_autoDetect` (square-clamped bounds) → `_detectGridSize` (N from gap bands) → `_extractGrid` (5×5 median sampling, white-strip) → `_cluster` (greedy + post-merge + force-to-N). All deterministic, offline.
- `_img.img` persists after the modal closes (not cleared by `_cleanup`), which is what lets the 🤖 button re-run on the last imported image.
- The AI path and the local path both feed `handleImageResult`, which now adopts the grid dimension from `result.grid.length` (clamped 5–12) and updates the slider/label. So importing can change the grid size.
- Gemini key lives only in `localStorage['gemini_api_key']`. Never hardcode it — the repo is public.
- Proven debugging approach for detection bugs: a standalone Python+Pillow harness that replicates the JS sampling against the actual screenshot files (faster than guessing). Throwaway scripts lived in `/tmp`.
