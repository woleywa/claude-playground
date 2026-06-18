@session-index.md

# Tasks

## Open

- [ ] **Verify Solve-button text color** — set to `#111` in S3 but user reported it still looked light at session end (likely deploy/browser cache). Confirm after deploy; investigate specificity if it persists.
- [ ] **Rotate the Gemini API key** — key was pasted in plaintext during S3. It never entered the repo (localStorage only), but rotate it in Google Cloud Console to be safe.
- [ ] **Preset puzzles** — 2–3 encoded example puzzles, "Load Example" button → `docs/tasks/preset-puzzles.md`
- [ ] **Multiple-solution detection** — warn when puzzle is ambiguous (solver finds >1 solution)
- [ ] **Disconnected-region warning** — warn if a color region has disconnected parts (invalid puzzle)
- [ ] **Undo** — paint history; Ctrl+Z on desktop, gesture on mobile

## Recently done

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
