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

## 2026-06-19 (S3) — Square-clamp the auto-detect bounding box

**Decision:** After the colorful-pixel bounding box, clamp it to a square using the shorter side, anchored at the top-left corner.
**Why:** The game's action buttons (Apply, pencil, lightbulb) sit *below* the grid and are colorful, so they extended the bounding box height ~23%. The per-cell sample grid then stretched into the empty cream background below the puzzle, producing ghost colors and shifting every lower row. The puzzle grid is always square and its top-left is clean (header/counter are above the scan band), so clamping to the shorter side anchored top-left recovers the true grid. Root-caused with a Python+Pillow harness replaying the JS sampling on real screenshots — guessing had failed twice.

## 2026-06-19 (S3) — Detect grid size from tile gaps, not the slider

**Decision:** `_detectGridSize` counts "tile bands" along columns and rows within the square bounds; N is the band count when columns and rows agree and fall in 5..12, else the slider value is the fallback.
**Why:** The slider defaulted to 10, so a 9×9 puzzle was sliced into 10 columns. Tiles are separated by cream gaps that read as non-colorful, so the colorful-fraction profile dips once per gap — counting the bands gives N directly. Threshold 0.4 on the profile was validated against real 9×9 and 10×10 screenshots.

## 2026-06-19 (S3) — Pixel sampling is the default; AI is optional

**Decision:** Local pixel sampling remains the default color detector. The Gemini 🤖 button is an opt-in second opinion, not the primary path.
**Why:** In a side-by-side test on the user's real screenshot, Gemini (`gemini-flash-latest`) was slower, hit repeated 503s, and was *less* accurate — it merged the rose/mauve region into pink and hallucinated an extra green region. The fixed pixel sampling identified all 10 regions correctly, for free and offline. Determinism + exact pixel values beat a vision model that estimates region boundaries on clean screenshots.

## 2026-06-19 (S3) — Gemini API key in localStorage, never committed

**Decision:** The AI button prompts for the API key once and stores it only in `localStorage['gemini_api_key']`; it is never written to the repo.
**Why:** The site is a static GitHub Pages app in a *public* repo — a hardcoded key would be visible in source and git history forever, and abusable on the owner's billing. A static host cannot keep a secret, so each user supplies their own key client-side. (Chosen over baking in a key or standing up a serverless proxy.)

## 2026-06-19 (S3) — Strip near-white pixels before the cell-color median

**Decision:** `_medRGB` discards pixels with all channels > 210 (the white X-mark overlay) before computing the per-cell median, falling back to all samples only if < 30% colored remain.
**Why:** The game draws large white-bordered X marks on cells the player has excluded. With 5×5 sampling, those white pixels could drag the median toward white. Stripping them recovers the underlying region color even when the X covers most of the cell.

## 2026-06-19 (S3) — Direct-to-main, no feature branches (this project)

**Decision:** Commit and push straight to `main`; no feature branches/PRs for the Meowdoku project.
**Why:** Solo toy project on static hosting — branch/PR overhead isn't worth it. (Overrides the global default of always using feature branches; recorded in `meowdoku/CLAUDE.md`.)

## 2026-07-18 (S5) — GitHub Pages deploys the whole repo, not just `meowdoku/`

**Decision:** `.github/workflows/deploy.yml`'s `upload-pages-artifact` path changed from `meowdoku/` to `./`.
**Why:** The repo became multi-project (Meowdoku + Zlatan + a root landing page), but the deploy workflow was still publishing only the `meowdoku/` subfolder as the site root — so the landing page and Zlatan site were fully built and committed but literally unreachable at any URL. This isn't Meowdoku-specific, but it directly blocked verifying any Meowdoku-adjacent work in production.

## 2026-07-18 (S5) — Cat detection: near-black threshold, not "darker than background"

**Decision:** `_extractGrid` flags a cell as containing a cat when a dense 9×9 sample finds ≥6 pixels below an absolute brightness of 60, not a background-relative threshold.
**Why:** An earlier version used <95 absolute brightness, which was loose enough that a dark forest-green tile (~97 bright) got misdetected as a cat, flooding one color region with ~10 phantom cats that then corrupted every downstream tactic deduction. True cat fur/eyes/outline are genuinely black (~10–40); no game tile color gets that dark, so 60 is a safe floor with real margin on both sides — verified against three real boards (2, 5, and 6 cats): all cats found, zero false positives.

## 2026-07-18 (S5) — X-mark detection: desaturation, not brightness-relative-to-background

**Decision:** `isWhiteX` tests `min(r,g,b) > 195 && max(r,g,b) − min(r,g,b) < 30` — i.e., "is this pixel near-white/gray" — instead of the original "brighter than this cell's own background by a fixed +35."
**Why:** The relative-brightness margin shrinks as the background gets brighter, so it becomes unreliable specifically on light pastel colors. Measured on a real screenshot: pink backgrounds run ~175 bright against a ~210-bright glyph, leaving only ~35 of headroom (the exact threshold) before antialiasing noise causes a miss — versus 65+ of headroom on a dark color like brown. Desaturation is invariant to the background's own brightness, since it only asks whether the sampled pixel itself looks white/gray.

## 2026-07-18 (S5) — Grid-size tile-band threshold lowered to 0.2

**Decision:** `_detectGridSize`'s colorful-fraction band threshold changed from 0.4 to 0.2.
**Why:** A heavily X-marked row's colorful fraction can dip to ~0.29 (white X strokes read as non-colorful), which 0.4 mistook for an inter-tile gap — fragmenting one row into several bands and misreading an 8×8 board as 10×10. Real gaps read ~0.0, so 0.2 sits with a wide margin on both sides. Verified against an 8×8 board and two 10×10 boards.

## 2026-07-18 (S5) — A "No Room" tactic was tested and rejected, not built

**Decision:** No dedicated tactic for "a cat here would immediately strand some row/column/color" was added to the Explain engine.
**Why:** Verified empirically (not assumed) across ~47,000 simulated positions that this case is *always* already caught by tactics that run earlier: a 1-candidate stranded unit is caught by Last Spot, a 2+-candidate one by Shared Shadow (whose "blocks" test is symmetric — "X would empty unit G" and "every remaining cell of G blocks X" are the same statement). Building it would have added code that could never fire. The habit of checking "would this ever actually fire?" before implementing a plausible-sounding tactic is the reusable lesson.

## 2026-07-18 (S5) — What-If shows one dead end at a time, not batched

**Decision:** The contradiction-testing tactic (What-If) finds every dead end in a pass but shows only the one with the shortest forced chain; the rest are available via a separate "Apply All" action, not folded into the main Apply.
**Why:** An earlier design batched every dead end found into a single Apply, on the reasoning that testing them all against one board snapshot is sound (they're independent) — true, but it produced single Explain-presses crossing out 14 or 32 cells at once with no way to see why any individual one died, which user testing on real Hard levels confirmed was unfollowable. Per-cell chain depth varies from 1 to 8+ forced placements, so showing the shallowest one with its reasoning spelled out keeps each press comprehensible, while Apply All preserves the option to move fast once the pattern is understood.
