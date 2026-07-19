# game.williammulvaney.com

GitHub Pages allows one custom domain per site, and this repo's site already
owns `williammulvaney.com` — so the `game.` subdomain needs its own tiny repo
with its own Pages site. This folder holds everything that repo needs.

## One-time setup

1. **Create the repo**: https://github.com/new → name it `sleeper`, public,
   check "Add a README".
2. **Add the workflow**: copy `deploy.yml` from this folder to
   `.github/workflows/deploy.yml` in the new repo (or ask Claude to do it).
   On its first run it pulls the game from this repo, enables Pages, sets the
   custom domain, and deploys. It re-syncs daily and on demand
   (Actions → "Sync and deploy SLEEPER" → Run workflow).
3. **Add the DNS record** at your DNS provider:

   | Type  | Host/Name | Value                  |
   |-------|-----------|------------------------|
   | CNAME | `game`    | `wmulvaney.github.io`  |

4. After DNS propagates (minutes to an hour), open the `sleeper` repo →
   Settings → Pages and check **Enforce HTTPS** once the certificate is ready.

The game itself stays canonical in this repo at `public/athlete/` — the
`sleeper` repo is only a deploy target. The PWA is path-agnostic (relative
`start_url`/`scope`, service worker derives its base from its own URL), so the
identical files serve at both `williammulvaney.com/athlete/` and
`game.williammulvaney.com`.
