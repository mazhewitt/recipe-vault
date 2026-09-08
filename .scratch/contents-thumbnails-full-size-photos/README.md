# Contents page polaroids load full-size photos

Status: ready-for-human
Reported: 2026-09-06
Reporter: mazda (recorded as a cross-cutting risk in the Journal 2.0 plan)

## Description

Since `journal-typography-contents`, each contents-page row with a photo
renders `<img src="/api/recipes/{id}/photo?e={photoEpoch}">` inside a 56x48
polaroid. The endpoint serves the original upload, which can be up to 5 MB.
A family with fifty photographed recipes downloads tens of megabytes to draw
thumbnails.

Mitigations already in place: `loading="lazy"`, `decoding="async"`, stable
URLs so the browser cache and Cloudflare cache both work.

## Decision needed

- **Accept as is.** Photo counts are small today and caching makes repeat
  visits free.
- **Server-side thumbnails.** Add `?size=thumb` to the photo endpoint,
  generating and caching a ~200px JPEG on first request (the `image` crate is
  the obvious choice). Would become an OpenSpec change touching
  `recipe-photo-storage`.

Reopens if photo counts or upload sizes grow, or once the phone layout in
`journal-book-only-layout` puts a polaroid on every recipe page too.

## Comments

### 2026-09-08 — Claude

**The caching claim is wishful.** `get_photo` sets one header,
`Content-Type` (`src/handlers/recipes.rs:291-299`): no `Cache-Control`, no
`ETag`, no `Last-Modified`, and the `no-cache` layer covers `/static` only
(`main.rs:202-211`). Nothing to revalidate against, and no file extension on
the URL, so neither the browser nor Cloudflare's default cache holds it — a
repeat visit costs what the first did. An edge cache keyed on URL alone would
also break family scoping. At ~60px a row, `loading="lazy"` defers little.

**Bytes.** Nothing resizes anywhere, so served bytes are upload bytes, capped
at 5 MB in both `app.js:27` and `recipes.rs:206`. A synthetic 12 MP q85 photo
measures 2.23 MB; a cold spread costs 22 MB at 10 photographed recipes,
110 MB at 50, ~140 MB at 200 and 450 MB scrolled through. The polaroid needs
100x74 device px; a 200px JPEG measured 3.3 KB, so call 50 recipes 0.5 MB.

**Cost of `?size=thumb`.** `image` is in neither `Cargo.toml` nor
`Cargo.lock`. Measured at `--no-default-features --features
jpeg,png,webp,gif`: 20 net-new crates, ~35 s extra CPU per clean build,
+1.05 MB binary, 26 ms decode + 7 ms resize per photo — once, then cached
under `/app/data/thumbs/` on the same bind mount. Deltas:
`recipe-photo-storage`, `recipe-book-index`. Key the cache on mtime+len, not
`photoEpoch`: `app.js:24` resets to 0 on load and is bumped only by this
tab's own upload, so it misses a replacement made elsewhere.

**Nothing ahead reopens this.** `book-spread-modes` cuts exposure: Cook mode
drops the contents off the left page. `journal-book-only-layout` is what raised
the cost — `recipe-display.js:749` re-renders it on every recipe open.

**A third option, no Rust.** Cloudflare Image Resizing is not free here: it
needs Images on the zone, and the edge subrequest hits Access on the tunnel.
But `app.js:334` can canvas-downscale to ~1600px q0.82 before POSTing —
~300 KB a photo, no dependency, one upload-scenario delta, new photos only.

**Recommendation.** Take the cheap pair now — canvas downscale on upload,
plus `Cache-Control: private` and an `ETag` on `get_photo` — and hold
`?size=thumb` until a family passes ~30 photographed recipes or the mean of
`/app/data/photos` exceeds ~300 KB.
