# SLEEPER sync worker

A tiny Cloudflare Worker that connects a real sleep tracker (Oura or Whoop)
to the SLEEPER app, so real nights flow into the game automatically — no
manual input.

## Deploy (about 10 minutes)

1. **Create the worker**
   ```bash
   npm create cloudflare@latest sleeper-sync -- --type hello-world
   cd sleeper-sync
   cp ../sleeper-sync-worker/worker.js src/index.js
   ```

2. **Create a KV namespace** for tokens and bind it as `TOKENS` in
   `wrangler.toml`:
   ```toml
   kv_namespaces = [{ binding = "TOKENS", id = "<your-kv-id>" }]
   ```

3. **Register an API app** with your tracker:
   - Oura: https://cloud.ouraring.com/oauth/applications (redirect URI:
     `https://<your-worker>.workers.dev/auth/callback`)
   - Whoop: https://developer.whoop.com (same redirect URI)

4. **Set secrets**:
   ```bash
   wrangler secret put APP_TOKEN            # any long random string — the app uses this
   wrangler secret put OURA_CLIENT_ID       # and/or the WHOOP_ pair
   wrangler secret put OURA_CLIENT_SECRET
   ```

5. **Deploy** (`wrangler deploy`), then visit
   `https://<your-worker>.workers.dev/auth/oura` (or `/auth/whoop`) once and
   approve access.

6. **In SLEEPER**: Home → nightstand → Auto-sync. Enter the worker URL and
   your `APP_TOKEN`. Done — the app pulls new nights on launch and every
   10 minutes, and each becomes your next in-game night.

## Endpoint contract

`GET /nights?since=YYYY-MM-DD` with `Authorization: Bearer <APP_TOKEN>` →

```json
{ "nights": [ { "date": "2026-07-18", "score": 84, "hours": 7.6,
                "efficiency": 0.91, "deep": 0.18, "rem": 0.22,
                "restingHR": 52 } ] }
```

Any server that speaks this contract works — the worker is just the
reference implementation.
