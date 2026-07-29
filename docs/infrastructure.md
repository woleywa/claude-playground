# Infrastructure decisions

Cross-project notes on where backend services, databases, and related infra should live for
projects in this playground that outgrow "static site on GitHub Pages" (e.g. Yoink's optional
backend resolver, see `yoink/docs/BACKEND.md`). Not yet implemented — this is the reference
doc to pick back up when we actually build one.

## Hosting: GitHub Pages only serves static files

GitHub Pages can't run server-side code at all — it's static hosting. Any project needing a real
backend process (long-running server, `ffmpeg`, a database connection, etc.) needs to run
somewhere else, reachable over HTTPS from the static frontend.

## Where to run backends for multiple projects, without provisioning a new box per project

Goal: one place to add backend services for future projects (Yoink and whatever comes next),
not a new server per project.

| Option | Cost | Tradeoff |
|---|---|---|
| **VPS + Docker Compose + Caddy** (Hetzner ~€4/mo, DigitalOcean ~$6/mo) | Cheapest | You own ops: OS patching, container restarts, TLS renewal. One box, many containers, one reverse proxy routing by subdomain/path. |
| **Railway / Render** | Pricier per project, still cheap | Managed — no sysadmin — and both handle long-running processes / Docker images fine (unlike serverless platforms). Good fit if the VPS ops overhead isn't wanted. |
| **Vercel** | Free tier generous, scales with usage | Built for serverless/edge functions with execution-time limits — a poor fit for anything needing `ffmpeg` or long-running extraction (e.g. Yoink's backend), even though it's the most familiar "one platform, many projects" option. |

**Leaning:** VPS + Docker Compose if comfortable with light sysadmin (cheapest, most flexible,
fits `ffmpeg`-heavy workloads like Yoink's backend); Railway/Render if we'd rather not touch a
terminal for ops.

## Databases: avoiding Supabase's cost at this scale

Supabase was the default reach-for-it choice but is expensive relative to what a handful of
hobby/playground projects actually need.

| Option | Cost | Tradeoff |
|---|---|---|
| **Self-hosted Postgres or SQLite** in a container on the same VPS | Free beyond the VPS itself | You own backups, patching, and isolation — see security notes below. |
| **Neon** (managed serverless Postgres) | Generous free tier, cheap pay-per-use scaling | Managed — backups/isolation handled for you — without Supabase's bundled-platform markup. Good fallback once a project has real user data worth not losing. |
| Supabase | Expensive at this scale | Ruled out for now — paying for a whole bundled platform (auth, storage, realtime) when only the DB is needed. |

**Leaning:** self-hosted Postgres/SQLite for now (all current projects are hobby-scale, nothing
storing real user data yet); move a specific project to Neon if/when it needs backups and
isolation handled for it rather than by us.

## Security checklist, if self-hosting DB + backend

Self-hosting trades a vendor's default security posture for doing it ourselves. Minimum bar
before putting real data on a self-hosted box:

- **Never expose the DB port to the internet.** Bind Postgres to the Docker-internal network
  only; backend containers reach it over the compose network, nothing external can.
- **Separate DB user/credentials per project**, not one shared superuser — a bug or compromise
  in one project's backend shouldn't be able to read or wreck another project's data.
- **Automate encrypted, off-box backups** (e.g. nightly dump to Backblaze/S3). Self-hosting
  doesn't give you this for free the way a managed service does — this is the thing people
  forget until they lose everything to one bad `rm` or a disk failure.
- **Patch and firewall the host itself**: unattended-upgrades, `ufw` allowing only 22/80/443,
  key-only SSH. One compromised box now holds several projects' worth of blast radius, not just
  one.
- Same rules apply to any project-specific secrets (e.g. Yoink MCP server's `download_media`
  tool — see `yoink/mcp-server/README.md`'s note on adding auth before exposing it publicly).

## Status

Decision/reference only — nothing here has been provisioned yet. Update this doc when we
actually stand up the VPS/Compose setup or pick a managed platform, and link the concrete
setup steps from here.
