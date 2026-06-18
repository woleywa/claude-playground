# Decisions

## 2026-06-18 — Vanilla JS, no framework

**Decision:** Plain HTML + CSS + JS with no build step.
**Why:** Single-page tool deployed to GitHub Pages. No build tooling overhead; works by opening index.html directly. React or Vite would add complexity with zero benefit for a tool this size.

## 2026-06-18 — Row-by-row backtracking with only row-1 adjacency check

**Decision:** Solver iterates rows in order and checks only `placed[row-1]` for diagonal adjacency.
**Why:** Since we place exactly one cat per row going top-to-bottom, a cat at row `r` can only be adjacent to cats in rows `r-1`, `r`, or `r+1`. Since `r+1` hasn't been placed yet and we enforce one per row, only `r-1` matters. This reduces the adjacency check from O(N) to O(1) per candidate.

## 2026-06-18 — CSS `calc()` for emoji sizing, not JS

**Decision:** Cat emoji font-size uses `calc(0.55 * min(calc(100vw - 2rem), 480px) / var(--grid-size))` in CSS, with `--grid-size` set via JS.
**Why:** Keeps sizing logic in CSS where it belongs. The formula scales correctly across all grid sizes (5–12) and screen widths without any JS resize listeners.
