# Sharing mints a new public link on every tap, falls back to `prompt()`, and the share page previews badly

Status: needs-triage
Reported: 2026-10-17
Reporter: Claude (usability audit, openspec/changes/steady-cooking-spread/audit-summary.md)
Severity: low-medium. Sharing works, but it is clumsy on the phones and tablets where people share, and every extra tap leaves another live 30-day public link.

## Description

Two findings from the audit's "manage" explorer: `share-clunky` and `share-page-issues`.

### The share button (`share-clunky`)

- **Each tap mints another token.** `setupShareButton` (`static/app.js:402-450`) sends `POST /share` on every click (`app.js:412`). Two taps gave `/share/yKcD68MDQO` and `/share/LgU01tDCwT`, and both stay live for 30 days.
- **It blocks the page without clipboard permission.** A native `prompt('Copy this share link:')` (`app.js:430`) appears, then "Link created!".
- **The confirmation lands far from the button.** "Link copied!" is appended to the title row with `right: 0` (`app.js:434-437`, `styles.css:738-751`). At tablet it sits at x=670-756, over the polaroid and touching the "›" arrow, while the share button is at x=588.
- **There is no native share sheet.** Phones and tablets get no `navigator.share`, and "send to WhatsApp" is what people want there.
- **The button is 28x28** (`styles.css:708-721`). steady-cooking-spread D9 makes it 44px and moves it to the meta line. Its task 7.3 re-anchors the toast to the button; the rest of this issue is untouched by that change.

Evidence: remeasure `share-new-token-each-tap`, two taps gave distinct tokens. Screenshots `share-tablet-granted.png` and `share-phone-granted.png` are in the audit session's `audit/manage/shots/`. The remeasure script is `tests/usability/remeasure/manage.cjs`.

### The public share page (`share-page-issues`)

Everything here is in `src/handlers/share.rs`:

- **No link-preview photo.** `og:image` is the relative `/share/<token>/photo` (`share.rs:203`), so WhatsApp, iMessage and Slack previews show no photo.
- **The photo has no size.** The `<img>` has no width, height or aspect-ratio (`share.rs:187`). The method shifts down when the photo loads, and a 1x1 test photo is stretched to 358x358 (phone) and 648x400 (desktop).
- **Steps are numbered twice: "1. Step 1. Heat…".** The `<ol>` numbers the steps, and each `<li>` adds its own `<strong>Step {}.</strong>` (`share.rs:146`, `<ol>` at `:276`).
- **The copy button is 127x30** (`share.rs:262`, `padding: 8px 16px`).
- The page uses the system font, not the book's look. Noted only.

Evidence: remeasure `share-page-issues`: `og:image='/share/P79EAFO249/photo' (absolute=false)`, no width or height on the image, copy button 127x30, first step "Step 1. Heat" inside a numbered `<ol>`. Screenshots: `sharepage-lasagne-phone.png`, `sharepage-roast-desktop.png`.

## What a fix needs

- `navigator.share({ url, title })` where it exists. Fall back to the clipboard, then to an inline copyable field. Never `prompt()`.
- Reuse an unexpired token for the same recipe and user rather than minting one per tap. This is a server change.
- Anchor the confirmation to the button.
- Share page:
  - an absolute `og:image`, from a configured public base URL or the request host;
  - a fixed aspect-ratio photo box (`aspect-ratio: 4/3; object-fit: cover`);
  - one step numbering, not two;
  - a copy button at least 44px tall.
- recipe-sharing "Share button in recipe UI" only requires copy-to-clipboard plus a confirmation. `navigator.share` and token reuse are additions, so this probably becomes an OpenSpec change against `recipe-sharing`.
