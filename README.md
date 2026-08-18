# `parked` branch

This is an **orphan branch** — it shares no history with `main` and contains no
application code. Its only job is to be the production branch of the retired
Cloudflare Pages project `dreamachine-s5k`, so that
`dreamachine-s5k.pages.dev` serves a dead-end notice instead of the app.

## Why the project isn't just deleted

The old URL is embedded in this repo's public git history (commit `cd21b52`,
which briefly added a demo link to the README). Deleting the Pages project
would release the name `dreamachine-s5k` back to Cloudflare's pool, letting
anyone else claim it and serve arbitrary content at a URL that a reader of this
history would reasonably trust. Keeping the project alive but inert holds the
name permanently and guarantees the old link resolves to nothing of substance.

The live deployment moved to a new, unadvertised Pages project. Per `SPEC.md`
§8.3 on `main`, that URL is deliberately not published in this repo — including
here.

## Cloudflare Pages settings this branch expects

The `dreamachine-s5k` project must be configured with **no build step**, since
this branch has no `package.json`:

| Setting | Value |
| --- | --- |
| Production branch | `parked` |
| Build command | *(empty)* |
| Build output directory | `/` |
| Preview branches | None (excluded) |

## Contents

- `index.html` — the notice; static, no JavaScript, no strobe of any kind
- `404.html` — byte-identical to `index.html`, so deep links land on it too
- `robots.txt` — disallow all (the page also carries a `noindex` meta tag)

## Maintenance

Nothing here should need to change. Don't merge `main` into this branch, and
don't add a `package.json` — either would trigger a build and defeat the point.
