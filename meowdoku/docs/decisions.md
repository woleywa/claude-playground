# Decisions

## 2026-06-18 — Vanilla JS, no framework

**Decision:** Plain HTML + CSS + JS with no build step.
**Why:** Single-page tool deployed to GitHub Pages. No build tooling overhead; works by opening index.html directly. React or Vite would add complexity with zero benefit for a tool this size.

## 2026-06-18 — Row-by-row backtracking with only row-1 adjacency check

**Decision:** Solver iterates rows in order and checks only `placed[row-1]` for diagonal adjacency.
**Why:** Since we place exactly one cat per row going top-to-bottom, a cat at row `r` can only be adjacent to cats in rows `r-1`, `r`, or `r+1`. Since `r+1` hasn't been placed yet and we enforce one per row, only `r-1` matters. Reduces the adjacency check from O(N) to O(1) per candidate.

## 2026-06-18 — CSS `calc()` for emoji sizing, not JS

**Decision:** Cat emoji font-size uses `calc(0.55 * min(calc(100vw - 2rem), 480px) / var(--grid-size))` in CSS, with `--grid-size` set via JS.
**Why:** Keeps sizing logic in CSS where it belongs. Scales correctly across all grid sizes (5–12) and screen widths without JS resize listeners.

## 2026-06-19 — Colorful-pixel bounding box for grid auto-detection

**Decision:** Auto-detect the grid by finding the bounding box of pixels with HSL saturation > 0.18 and lightness 0.25–0.88, skipping the top 28% and bottom 15% of the image.
**Why:** The game's colored cell regions are visually distinct from the neutral UI chrome (white/gray background, dark text). No CV library needed. Falls back gracefully to two-tap manual selection when detection is wrong or the aspect ratio check fails (< 0.72 or > 1.39).

## 2026-06-19 — Rule-based hint explanations, no AI

**Decision:** Hint explanations generated from direct constraint analysis (column taken, color placed, diagonal, dead end), not an AI API call.
**Why:** Keeps the tool fully offline/static. Immediate constraints cover the most common cases. "No valid continuation" is used for cases requiring forward checking — honest without being misleading.

## 2026-06-19 — Public GitHub repo for Pages hosting

**Decision:** `woleywa/claude-playground` is public.
**Why:** GitHub Pages on private repos requires a paid plan. The playground contains no sensitive data. Named `claude-playground` because `Playground` was already taken on the account.
