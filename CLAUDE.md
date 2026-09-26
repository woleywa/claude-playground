# Playground

Multi-project repository. Each project lives in its own subdirectory with its own `CLAUDE.md`.

## Projects

| Project | Directory | Description |
|---|---|---|
| Meowdoku Solver | `meowdoku/` | Mobile web tool for solving Meowdoku / LinkedIn Queens-style puzzles |
| Zlatan          | `zlatan/`   | Quotes and facts from Zlatan Ibrahimović |
| Block Out Solver | `block-out/` | Shortest-move solver for the Block Out sliding-block puzzle (BFS) |
| Yoink           | `yoink/`    | Social media downloader (YouTube/TikTok/Instagram/X) — client-side app + optional backend + MCP server |

## Rules

See `~/.claude/CLAUDE.md` for global rules. Each project's `CLAUDE.md` takes precedence for project-specific decisions.

No shared build system — each project is self-contained.

## Cross-project infrastructure

See `docs/infrastructure.md` for hosting/database decisions that apply across projects (where a
backend + database would run for projects that outgrow static GitHub Pages, e.g. Yoink).
