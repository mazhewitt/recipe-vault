# Photo upload: errors land far from the camera button, large phone photos are refused, there is no way to remove a photo, and every render re-downloads it

Status: needs-triage
Reported: 2026-10-17
Reporter: Claude (usability audit, openspec/changes/steady-cooking-spread/audit-summary.md)
Severity: low-medium. Modern phone photos are often over the 5MB limit, so the refusal is the common case, not an edge case.

## Description

From the audit's "manage" explorer: `photo-error-far-or-hidden`, plus the cache-buster half of `photo-upload-resets-scroll`.

- **Errors appear far from the button.** "Image too large…" and "Failed to upload photo." show inside the note slip for 3s, because `showError` (`static/app.js:179-189`) inserts a `.paste-error` into `.note-input`.
  - That is 1011px from the camera button in tablet cook mode and 1226px on desktop.
  - On the phone it is 620px away, and the error squeezes the book by 44px for the 3 seconds.
  - The contents-mode case, where the slip was hidden and the error never seen, is fixed by steady-cooking-spread D1.
- **Large photos are refused, not shrunk.** The 5MB limit (`app.js:373-377`) has no client-side downscale.
- **There is no way to remove a photo**, although `DELETE /api/recipes/:id/photo` exists. The button is still titled "Add photo" when it replaces one (`static/recipe-display.js:629`).
- **Every render re-downloads the photo** (`photo-upload-resets-scroll`). The photo URL gets a fresh `?t=Date.now()` on every render (`recipe-display.js:649`), although a `photoEpoch` exists for exactly this.

Evidence: remeasure `photo-error-far-or-hidden`:
- tablet, cook mode: the error is 1011px from the button;
- tablet, contents mode: the error is invisible;
- phone: 620px from the button, with the book's maxDev at 44px.

The explorer's t14 run measured 1226px on desktop.

## What a fix needs

- Show upload progress and errors inline beside the camera button or the polaroid, not in the note slip.
- Downscale large images client-side (canvas) before upload, so that a phone camera JPEG is accepted.
- Label the button "Change photo" when the recipe has one. Offer "Remove photo", for example from the photo preview.
- Use `photoEpoch` in the photo URL instead of `Date.now()`.
- The remove control probably touches recipe-photo-storage and family-recipe-ui "Recipe photo view is display-only", so it needs a spec decision first.
