# v2.10.0: checks that need production or a week of it

Status: ready-for-human
Reported: 2026-10-18
Reporter: Claude (the release of v2.10.0; tasks carried over from the archived changes)

v2.10.0 shipped on 2026-10-18 (Journal 2.0, Gemini 3.8 Flash at thinking
`low`, recipe tags). Two checks could not be done on release day.

## 1. The recipe URL is not cached at the edge (safe-page-navigation 10.8)

The whole site is behind Cloudflare Access, so this needs a signed-in browser:

1. Open a recipe, so the address bar shows `/chat?recipe=<id>`.
2. DevTools → Network, reload. On the `chat?recipe=…` document request,
   `cf-cache-status` must be `DYNAMIC` or `BYPASS` (never `HIT`).
3. The reload must open that recipe, not the contents.

## 2. The real monthly Gemini cost (upgrade-gemini-models 8.2)

After 2026-10-25, on the NAS:

```sh
sudo docker logs --since 168h recipe-vault 2>&1 | grep "gemini usage" > usage.txt
```

Sum `prompt_tokens`, `output_tokens` and `thoughts_tokens` per model and price
them. 3.8 Flash is $0.75 / $3.75 per 1M (thoughts billed as output) until
2026-12-31, then $1.50 / $7.50. Flash-Lite is $0.30 / $2.50. The research
estimated about $41 a month at mid traffic once the intro price ends.
`cached_tokens` shows how much implicit caching saves. The first days include
the one-off tags backfill on Flash-Lite.

Rollback for the chat model alone: `AI_MODEL=gemini-2.5-pro`, then
`sudo docker-compose up -d recipe-vault` (the production key is grandfathered).
