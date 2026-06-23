@session-index.md

# Tasks

## Open

- [ ] **Rotate the Gemini API key** — key was pasted in plaintext during S3. It never entered the repo (localStorage only), but rotate it in Google Cloud Console to be safe.
- [ ] **Preset puzzles** — 2–3 encoded example puzzles, "Load Example" button → `docs/features/preset-puzzles.md`
- [ ] **Multiple-solution detection** — warn when puzzle is ambiguous (solver finds >1 solution)
- [ ] **Disconnected-region warning** — warn if a color region has disconnected parts (invalid puzzle)
- [ ] **Undo** — un-apply a hint step; Ctrl+Z on desktop, gesture on mobile
- [ ] **Naked pair for columns** — tactic 5 currently only detects row pairs; add column version
- [ ] **Explain progress indicator** — show how many deductions remain / solve progress

## Recently done

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
