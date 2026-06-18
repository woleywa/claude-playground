# GitHub Pages Deploy

**Status:** Done (Session 2 — 2026-06-19)

## Setup

- Repo: `woleywa/claude-playground` (public)
- Live URL: https://woleywa.github.io/claude-playground/
- Workflow: `.github/workflows/deploy.yml`
- Trigger: push to `main` or manual `workflow_dispatch`

## How it works

GitHub Actions uploads the contents of `meowdoku/` (not the folder itself) as the Pages artifact. So `meowdoku/index.html` becomes the site root — no subfolder in the URL.

## Notes

- Repo had to be public because GitHub Pages on private repos requires a paid plan
- Named `claude-playground` because `Playground` was already taken
- Any `git push origin main` auto-deploys in ~30s
