@session-index.md

# Tasks

## Open

- [ ] **GitHub Pages deploy** — GH Actions workflow to deploy `meowdoku/` on push → `docs/tasks/gh-pages.md`
- [ ] **Preset puzzles** — 2–3 encoded example puzzles, "Load Example" button → `docs/tasks/preset-puzzles.md`
- [ ] **Multiple-solution detection** — solver currently returns first solution; detect + warn when puzzle is ambiguous
- [ ] **Disconnected-region warning** — warn when a color region is split into non-touching parts (makes puzzle invalid)
- [ ] **Undo** — paint history; Ctrl+Z on desktop, shake or swipe gesture on mobile

## Recently done (Session 1 — 2026-06-18)

- [x] **Core solver** — `solveMeowdoku()` backtracking CSP in `solver.js`
- [x] **Grid painter** — touch + mouse drag-to-paint, 12-color palette, eraser
- [x] **Responsive grid** — scales 5×5 to 12×12, cat emoji sizes via CSS `calc()`
- [x] **Solution overlay** — 🐱 with pop animation; clears automatically on next paint
- [x] **Status bar** — validation messages: uncolored cells, wrong color count, ready/solved states
- [x] **Project structure** — CLAUDE.md, session-index, TASKS, CHANGELOG, docs/
