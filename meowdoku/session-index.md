# Session Index

> Auto-loaded every session. At session start, read the latest session file from `docs/sessions/`.

---

## Wolfgang Wanninger

### Session 5 — 2026-07-18 ← latest
Two projects. **Playground:** added the Zlatan quotes/facts site (black/gold theme, random featured quote per visit, upvote/downvote) and a root landing page linking to it and Meowdoku; fixed the GitHub Pages deploy, which was only publishing `meowdoku/` and silently hiding everything else. **Meowdoku:** rebuilt the Explain tactic engine twice over — first expanded to 11 tactics, then completely rewritten so every deduction teaches Name → Rule → Here instead of one dense sentence, with a "checked first" trail showing what simpler techniques were tried. Added four new tactics (Line Lock reverse, Crowding hidden, Shared Shadow, Team Shadow) that shrank reliance on the What-If contradiction-tester on both hard reference boards tested; redesigned What-If itself to show one dead end at a time (shallowest forced chain, drawn out) instead of batching dozens into an unreadable single step, with an Apply All button for once the pattern is clear. Fixed four separate screenshot-import detection bugs (color naming, cat detection, grid-size, X-mark detection) — each root-caused against real sampled pixels rather than guessed. Added manual cat/X-mark correction tools and a visual polish pass. Verified all tactic-engine changes against the real `app.js` engine (via a Node `vm` sandbox), not just hand-written mirrors.
→ [docs/sessions/2026-07-18-session-05-wolfgang.md](docs/sessions/2026-07-18-session-05-wolfgang.md)

### Session 4 — 2026-06-23
Explain/Apply progressive coaching flow. Replaced verbose multi-line hints with a tactic engine that returns one deduction at a time — forced region, forced row, region confinement, naked pair — with visual cell highlights and an Apply/Cancel button pair. `state.revealed` replaced with `state.revealedRows: Set` to enable placing any specific cat. Applied X marks accumulate in `state.xMarks` and are respected by subsequent tactic detection. Created `docs/architecture.md` as a living design doc covering intent, decisions, and lessons learned.
→ [docs/sessions/2026-06-23-session-04-wolfgang.md](docs/sessions/2026-06-23-session-04-wolfgang.md)

### Session 3 — 2026-06-19
Dark-mode overhaul + tile-grid redesign with X marks on solved cells. Deep fix of screenshot detection: square-clamp bounds (action buttons were inflating the box), white-pixel X-mark stripping, and grid-size auto-detection from tile gaps (no more wrong N). Added clipboard paste import (📋 + Ctrl/Cmd+V) and an optional 🤖 Gemini color-detection button (key in localStorage; pixel sampling stays the default — it tested more accurate). Slider moved to a fixed bottom bar. Open: verify Solve-button text color, rotate Gemini key.
→ [docs/sessions/2026-06-19-session-03-wolfgang.md](docs/sessions/2026-06-19-session-03-wolfgang.md)

### Session 2 — 2026-06-19
Added screenshot import (Canvas auto-detect + two-tap fallback + color clustering), hint system (step-by-step with rule-based constraint explanation), and GitHub Pages deployment via Actions. Live at https://woleywa.github.io/claude-playground/
→ [docs/sessions/2026-06-19-session-02-wolfgang.md](docs/sessions/2026-06-19-session-02-wolfgang.md)

### Session 1 — 2026-06-18
Built the full Meowdoku solver from scratch: backtracking CSP solver, drag-to-paint grid editor (touch + mouse), 12-color palette with eraser, responsive layout 5×5–12×12, cat emoji solution overlay with pop animation, status bar. Vanilla HTML/CSS/JS, no dependencies.
→ [docs/sessions/2026-06-18-session-01-wolfgang.md](docs/sessions/2026-06-18-session-01-wolfgang.md)
