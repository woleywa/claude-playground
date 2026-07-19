# Session 05 — 2026-07-18 — Wolfgang

Theme: two projects. A new Zlatan site + playground landing page (and a deploy bug that was hiding both). Then a long run on the Meowdoku Explain tactic engine — expand it, rewrite its text as teachable lessons, then keep pushing until What-If (the contradiction-of-last-resort tactic) stopped being the thing doing most of the work.

## Completed — Playground / Zlatan

**Zlatan site (new)** — `zlatan/index.html`, `zlatan/style.css`, `zlatan/app.js`
- Quotes and facts in a black/gold theme, matching the dark aesthetic of the rest of the playground.
- A random quote + random fact are picked and shown in a "featured" strip at the top on every visit.
- 👍/👎 vote buttons on every item, persisted in `localStorage['zlatan_votes']`, toggle off on a second click.

**Playground landing page (new)** — root `index.html`
- Two cards linking to Meowdoku and Zlatan. Replaces the previous "nothing at the root URL" state.

**GitHub Pages deploy fixed** — `.github/workflows/deploy.yml`
- The workflow's `upload-pages-artifact` step only published the `meowdoku/` folder as the site root, so `woleywa.github.io/claude-playground/` served Meowdoku directly and the new landing page + Zlatan site were unreachable no matter how correct their code was. Changed `path: meowdoku/` → `path: ./` so the whole repo publishes, with the landing page at the root and both projects one level down.

## Completed — Meowdoku: manual correction tools

**X-mark-mode and cat-mode palette swatches** — `app.js`, `style.css`, `index.html`
- `X_MARK_MODE = -2`, `CAT_MODE = -3` alongside the existing `ERASER = -1`.
- Tap the ✕ swatch, then tap/drag cells to toggle X marks by hand (drag intent — set vs. clear — is fixed by the first cell touched in the gesture).
- Tap the 🐱 swatch, then tap a cell to place/remove a hand-added cat in `state.importedCats`. Placing a cat clears any X mark on that cell.
- Eraser extended to also clear a cell's cat and X mark, not just its color.
- Motivation: screenshot detection will never be 100% reliable (see below); these are the escape hatch.

**Auto-X on cat Apply** — `app.js`
- `markCatEliminations(row, col)` — when Explain's Apply places a cat, it now also X-marks everything that placement eliminates: the rest of its row, column, color region, and the 8 king-move-touching cells. Previously only the row got crossed out, so the board looked less "solved" than it should after each Apply.

## Completed — Meowdoku: screenshot-import accuracy fixes

Each of these was reported as "the app got something wrong on my puzzle," root-caused against real sampled pixels from the user's actual screenshot (never guessed), then fixed and re-verified. Full detail in `docs/features/screenshot-import.md`.

1. **Color naming showed every region as "Red."** `customColors` from the clustering pipeline are `"rgb(r,g,b)"` strings; `approxColorName()` only parsed `#rrggbb` hex, so every parse silently failed, hue defaulted to 0, and everything named "Red." Fixed by parsing both forms. Also raised the brown/orange lightness cutoff so muted browns stop reading as orange.
2. **Cat detection missed cats** (sparse 3×3 sampling landed between a cat's dark fur pixels) **then over-fired on dark tiles** (the fix's first threshold, `<95` brightness, was loose enough that a dark forest-green tile at ~97 brightness got flagged as a cat, flooding one color region with ~10 phantom cats — a real regression caught immediately by the user). Settled on a dense 9×9 sample counting genuinely near-black pixels (`<60`, ≥6 hits) — cat fur/eyes are ~10–40 bright, no tile color goes that dark.
3. **Grid-size misdetection** — an 8×8 board imported as 10×10. `_detectGridSize`'s tile-band threshold (0.4) mistook a heavily X-marked row's dip in colorful-fraction (down to ~0.29 — white X strokes aren't "colorful") for an inter-tile gap, fragmenting rows. Lowered to 0.2; real gaps read ~0.0, giving a wide margin.
4. **X-mark detection missed marks on light backgrounds, specifically pink.** `isWhiteX` required the glyph to be brighter than the cell's own background by a fixed +35 — a margin that collapses when the background is already bright (pink measured ~175 vs. a ~210-bright glyph, leaving only ~35 of headroom vs. 65+ on a dark color). Replaced with a desaturation test (`min(r,g,b) > 195 && max−min < 30`) that checks "is this near-white/gray" directly, independent of background brightness.

All four were verified against real sampled pixels extracted from the user's screenshots (not synthetic guesses), plus — for the grid-size and cat-detection fixes — replays across multiple real reconstructed boards to confirm no regressions.

## Completed — Meowdoku: Explain tactic engine, round 1 (expansion + rewrite)

**Expanded from 6 to 11 tactics** — forced region/row/column, region↔row and region↔column confinement with "vector isolation" (crossing out other colors on the confined line too), Set Saturation K=2..4 for rows and columns (generalizing "naked pair"), Line-Segment Halo, Diagonal Pinch, Conjugate Pair, and a Tactic 12 (later folded in) for depth-2 propagation contradictions — added because the fallback was firing too early and revealing answers with no reasoning.

**Rewritten as named lessons** — every deduction changed shape from one dense sentence to three parts, rendered as separate lines: **Name** (🎯 Last Spot, 📏 Line Lock, 👥 Crowding, 🤏 Shared Shadow, 🤔 What-If — a technique you can recognize next time), **Rule** (the general principle, in plain language), **Here** (how it applies to this board, coordinates last). `showHint()` rewritten to build this as structured DOM instead of one `textContent` string.

**What-If batched, then found to still be too abrupt.** The forward-check contradiction tactic originally returned on the *first* dead-end cell found; batching every dead end from one scan into a single Apply cut a 58-press Hard-level solve to 16 presses. This felt like a win at the time but turned out to be the wrong fix — see round 2.

## Completed — Meowdoku: Explain tactic engine, round 2 (why is What-If doing so much work?)

The user kept pushing on one question in different forms across several real Hard-level screenshots: *is What-If (the contradiction tester) really the only way to crack this position, or are we missing an explainable rule?* Each time, the honest answer required reconstructing the exact board from the screenshot (verified for region-connectivity and unique-solution before trusting it — see Problems below) and testing directly.

**Verified, then rejected: a "No Room" tactic.** The natural next idea was a dedicated tactic for "if a cat lands here, some unit is immediately stranded" (a depth-1 What-If). Testing across ~47,000 simulated positions showed this is *always* already caught by what runs earlier: if the stranded unit had 1 candidate, Last Spot already placed it; if 2+, the general Shared Shadow (below) already crosses the hypothesis cell out, because the "blocks" relationship it tests is symmetric. Correctly left out rather than built.

**Added, in human-difficulty order, before What-If:**
- **Line Lock, reverse** — if all of a *line's* open cells are one color, that color's cat is in this line (dual of the existing "color confined to a line" direction).
- **Crowding, hidden** — if K lines can only be reached by K colors combined, those colors must place inside those lines (dual of naked Crowding — "hidden pair/triple/quad").
- **Shared Shadow** — generalized the old Line-Segment Halo / Diagonal Pinch / Conjugate Pair (three fixed-shape special cases, capped at 2–3 candidates, touch-only) into one test: for any unit with any number of candidates, if *every* candidate would eliminate some other cell (via shared row, column, color, or king-move touch), that cell is dead. Strictly more powerful than what it replaced.
- **Team Shadow** — new coverage: sometimes no single unit dooms a cell, but two units *together* do — every consistent pairing of a candidate from unit A with one from unit B eliminates the same cell. Shipped one bug and caught it before pushing: the first version didn't handle the case where the two units share a candidate cell (one cat there satisfies both at once), which made it cross out a cell that was the puzzle's actual solution. Regression testing against a known-unique solution caught this immediately.
- **Checked-trail** — every hint now carries a `checked: [...]` array of technique names tried and found nothing before the one that fired, rendered as a dimmed, struck-through line above the lesson ("Checked first, no luck: Last Spot → Line Lock → Crowding").

Result on the two hard reference boards used throughout (level 840 and level 1130, both reconstructed pixel-by-pixel from real screenshots and confirmed unique-solution): What-If's share of the solve shrank substantially both times these techniques were added.

**What-If redesigned again — one dead end at a time.** Batching (round 1's fix) was still the wrong shape: a real Hard level surfaced a 14-cell batch, then later a 32-cell batch, in a single Explain press — "not humanly possible" to follow, per the user. Per-cell forced-chain depth varies enormously (1 to 8+ forced placements), so the final design sorts every dead end found in a pass by chain length and shows only the *shortest* — the most followable — with the chain traced out line-by-line and drawn on the grid as dashed, pulsing "ghost" cats (new `.cell.hint-ghost`, distinct from a real cat placement). An **Apply All** button (`state.pendingAllAction`, `runApplyAll()`) clears every dead end found that pass at once, for once the player has the pattern and wants to move faster.

## Completed — Meowdoku: visual polish

- Fixed uneven row heights (`grid-auto-rows: 1fr` — rows were auto-sizing to their tallest content, squishing the grid).
- Palette right-edge fade, shown only when the palette actually overflows (`scrollWidth` check), not permanently dimming the last swatch on grids that already fit.
- Restyled the AI-detection button from a loud purple gradient to a quiet outlined secondary button.
- Muted the "Ready · N colors" status line from link-blue to grey.
- Unified the two X-mark visual styles (solved-cell vs. imported/user-placed) to the same opacity, both animating.
- Translated the last three German strings (Gemini API-key prompt flow) to English.
- Made "locked" (about-to-be-crossed-out) cells pulse red like the target-cat cell pulses gold — they were a static, low-opacity ring that nearly disappeared against busy colored tiles.

## Problems encountered

**Reconstructing a puzzle from a screenshot must be verified before trusting it.** A first attempt to reconstruct a hard board from a small, heavily X-marked screenshot produced a region map that looked plausible but failed both sanity checks: a color's cells weren't all orthogonally connected, and the puzzle had 3 solutions instead of 1. Discarded rather than debugged from — redone from a cleaner screenshot the user provided, which passed both checks. Lesson written up in `docs/architecture.md`.

**An OS multitasking screenshot broke the auto-detect algorithm's assumptions.** A user screenshot comparing our app's output to the original game showed both as overlapping app-switcher cards, not one clean screenshot. Replaying `_autoDetect`'s colorful-pixel bounding box against it produced nonsensical geometry, because the algorithm assumes the *entire* square grid is visible — only ~3 of 10 columns were, the rest hidden behind the other card. Recognized and discarded rather than presented as meaningful; the useful signal came from visually comparing the two apps' rendered grids cell-by-cell instead.

**Prototype-only testing risks silent divergence from the real code.** New tactics were first prototyped as standalone Node scripts (fast to iterate on), which is not proof the actual `app.js` works — a hand-written mirror can diverge from the real file without anything noticing. Standard practice by the end of the session: load the real `app.js` + `solver.js` into a Node `vm` sandbox with a minimal DOM stub, and call `generateHintText()` directly. This caught real integration gaps (a tactic's returned object missing the `checked` field; the stub missing `requestAnimationFrame`/`classList.toggle` after a UI change) that the prototypes alone wouldn't have.

## Files changed

- `index.html` (root, new) — playground landing page
- `zlatan/index.html`, `zlatan/style.css`, `zlatan/app.js`, `zlatan/CLAUDE.md` (new) — Zlatan site
- `.github/workflows/deploy.yml` — deploy path `meowdoku/` → `./`
- `CLAUDE.md` (root) — added Zlatan to the project table
- `meowdoku/app.js` — palette swatches (X-mark/cat mode), `markCatEliminations`, full tactic engine rewrite (`generateHintText`, `showHint`, `clearHint`, `runApply`, `runApplyAll`), `approxColorName`/`parseColorRGB`
- `meowdoku/image.js` — cat detection, grid-size threshold, X-mark desaturation fix
- `meowdoku/style.css` — new swatch styles, hint-name/rule/here/checked/chain-step/more, hint-ghost, hint-locked pulse, Apply All button, visual-polish fixes
- `meowdoku/index.html` — Apply All button, cache-buster bumps (`app.js` v19→v26, `image.js` v16→v21, `style.css` v6→v13)
- `meowdoku/docs/architecture.md` — tactic hierarchy, Apply/Apply All, screenshot pipeline sections rewritten; new lessons learned
- `meowdoku/docs/features/coaching-system.md` — full tactic table, checked-trail, What-If redesign documented throughout the session
- `meowdoku/docs/features/screenshot-import.md` — Session 4 + Session 5 additions documented
- `meowdoku/session-index.md`, `meowdoku/TASKS.md` (this wrap-up)

## Key decisions

- Desaturation-based X-mark detection instead of background-relative brightness — see `docs/architecture.md` and `docs/features/screenshot-import.md`.
- Near-black (not "darker than background") threshold for cat detection, to avoid false positives on dark tile colors.
- Grid-size band threshold 0.2, not 0.4 — real inter-tile gaps read far below either value, so there's room to lower it.
- "No Room" tactic rejected as fully redundant with Last Spot + Shared Shadow — verified empirically rather than assumed.
- What-If shows one dead end at a time (shallowest chain), not batched — teachability over speed, with Apply All as the speed option for players who want it.
- GitHub Pages now deploys the whole repo, not just `meowdoku/` — required for the multi-project playground to work at all.

## Open / next priorities

See `TASKS.md`. Nothing from the existing Open list was completed this session; several new fixes (screenshot-import accuracy, tactic engine) were added directly as Recently Done rather than tracked as Open→Done, since they were reported and resolved within the same session.
