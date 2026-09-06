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
