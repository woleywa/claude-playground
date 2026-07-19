@session-index.md

# Tasks

## Open

- [ ] **Validate imported cats** — `handleImageResult` trusts `result.cats` blindly, so a detection glitch can flood one color region with many touching cats. Add `sanitizeImportedCats(cats, grid, n)`: drop any cat that conflicts with another (same row / column / color region, or king-move touching); surface a status note when cats are dropped so the user can re-add real ones with the 🐱 tool.
- [ ] **Rotate the Gemini API key** — key was pasted in plaintext during S3. It never entered the repo (localStorage only), but rotate it in Google Cloud Console to be safe.
- [ ] **Preset puzzles** — 2–3 encoded example puzzles, "Load Example" button → `docs/features/preset-puzzles.md`
- [ ] **Multiple-solution detection** — warn when puzzle is ambiguous (solver finds >1 solution)
- [ ] **Disconnected-region warning** — warn if a color region has disconnected parts (invalid puzzle)
- [ ] **Undo** — un-apply an Explain step; Ctrl+Z on desktop, gesture on mobile
- [ ] **Explain progress indicator** — show how many deductions remain / solve progress

## Recently done

- [x] **Playground landing page** — root `index.html` links to Meowdoku and Zlatan (Session 5)
- [x] **Zlatan site** — quotes + facts, black/gold theme, random featured quote/fact per visit, upvote/downvote (Session 5)
- [x] **GitHub Pages deploy fixed** — was only publishing `meowdoku/`; now publishes the whole repo so the landing page and Zlatan site are reachable (Session 5)
- [x] **Visual polish pass** — fixed row-height bug (`grid-auto-rows`), palette overflow fade, AI-button restyle, muted status line, unified X-mark styling, translated remaining German strings to English (Session 5)
- [x] **What-If redesigned** — shows one dead end at a time (shallowest forced chain, spelled out line-by-line, dashed "ghost" cat highlight) instead of batching dozens at once; **Apply All** button clears every dead end found that pass (Session 5)
- [x] **New tactics** — Line Lock (reverse), Crowding (hidden), Shared Shadow (generalizes the old line-segment/pinch/conjugate-pair Squeeze to any candidate count), Team Shadow (two-unit joint reasoning) (Session 5)
- [x] **Tactic engine rewritten as named lessons** — every deduction now teaches Name → Rule → Here instead of one dense sentence; a dimmed "checked first" trail shows which simpler techniques were tried and failed (Session 5)
- [x] **Screenshot import accuracy fixes** — color naming (`approxColorName` now parses `rgb()`, not just `#hex`), cat detection (dense near-black sampling, no more false positives on dark tiles), grid-size band threshold (0.4→0.2, fixes 8×8 misread as 10×10), X-mark detection (desaturation-based, fixes misses on light backgrounds like pink) (Session 5)
- [x] **Manual correction tools** — 🐱 cat-mode and ✕ X-mark-mode palette swatches; eraser also clears cats/X marks (Session 5)
- [x] **Auto-X on cat Apply** — placing a cat via Explain now crosses out everything it eliminates (row, column, color region, 8 touching cells) (Session 5)
- [x] **Explain tactic engine expanded** — 11 tactics: forced region/row/col, region confinement + vector isolation, set saturation K=2..4 rows+cols, line-segment halo, diagonal pinch, conjugate pair, forward-check contradiction; fallback text improved (Session 5)
- [x] **`docs/features/hint-system.md` → `coaching-system.md`** — renamed, separated Hint and Explain into distinct sections (Session 5)
- [x] **Explain/Apply progressive coaching flow** — tactical hints + Apply/Cancel buttons; each press gives one deduction; applied X marks accumulate (Session 4)
- [x] **`revealedRows` Set** — replaced `revealed` counter; enables placing any specific cat in any order (Session 4)
- [x] **`docs/architecture.md`** — living design doc: intent, decisions, lessons learned (Session 4)
- [x] **Imported cat detection** — cats from screenshots shown permanently on grid (Session 4)
- [x] **k-means++ color clustering** — replaced greedy nearest-neighbor; always returns exactly N clusters (Session 4)
- [x] **Dark mode** — static dark theme across all UI (Session 3)
- [x] **Tile grid + X marks** — gap/rounded-tile redesign, ✕ on solved/excluded cells (Session 3)
- [x] **Detection fix: square-clamp bounds** — buttons below grid were inflating the box; now clamped to square (Session 3)
- [x] **Grid-size auto-detection** — N derived from tile gaps instead of the slider (Session 3)
- [x] **Clipboard paste import** — 📋 button + Ctrl/Cmd+V (Session 3)
- [x] **AI color detection (opt-in)** — 🤖 Gemini button, key in localStorage; pixel sampling stays default (Session 3)
- [x] **Bottom size bar** — slider moved to fixed bottom bar (Session 3)
- [x] **Screenshot import** — Canvas auto-detect + two-tap fallback + RGB color clustering (Session 2)
- [x] **Hint system** — step-by-step cat placement with rule-based constraint explanation (Session 2)
- [x] **GitHub Pages deploy** — `woleywa/claude-playground`, live at https://woleywa.github.io/claude-playground/ (Session 2)
- [x] **Core solver** — `solveMeowdoku()` backtracking CSP (Session 1)
- [x] **Grid painter** — touch + mouse drag-to-paint, 12-color palette, eraser (Session 1)
- [x] **Responsive grid** — scales 5×5 to 12×12 (Session 1)
- [x] **Solution overlay** — 🐱 with pop animation (Session 1)
