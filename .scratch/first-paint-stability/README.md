# First paint: the web fonts reflow the recipe, unpinned marked.js blocks paint, and the placeholder jumps

Status: needs-triage
Reported: 2026-10-17
Reporter: Claude (usability audit, openspec/changes/steady-cooking-spread/audit-summary.md)
Severity: low as polish. The marked.js item is also an availability and supply-chain risk: an upstream release changes chat rendering without a deploy.

## Description

Three load-time findings from the audit's "manage" explorer.

### 1. Late fonts reflow the open recipe (`font-swap-reflow`)

The page renders in fallback fonts, then swaps when Kalam and Libre Baskerville arrive.

- Evidence:
  - step 6 moves +29px (phone), +18px (tablet) and -5px (desktop);
  - the account chip grows from 180 to 198px and shifts 18px;
  - a recipe opened before the fonts arrived gives a CLS of 0.035 (tablet) and 0.022 (desktop);
  - delaying the Google Fonts CSS delays first paint by the full delay: FCP 1588-1644ms with a 1500ms delay.
- Cause: `static/chat.html:9` loads Google Fonts with `display=swap` and no metric-matched fallback. The fallbacks in `static/styles.css:37-38` (`'Caveat', cursive` and `Georgia`) have different metrics.
- family-recipe-ui "Font loads and applies" requires the fonts to come from Google Fonts.

### 2. Unpinned marked.js blocks paint (`cdn-script-blocks-paint`)

- Cause: `chat.html:11` has `<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js">` in `<head>`, with no `defer` and no version. It is `marked@latest`.
- Evidence: with jsdelivr delayed 3000ms, FCP is 3148ms (normally about 110ms). With the CDN blocked outright the page still works, because `static/utils.js:38` falls back to plain text, and it logs one `ERR_FAILED`.
- Its only use is `utils.js:38`.

### 3. The placeholder jumps on load (`first-paint-placeholder-jump`)

Every load first paints the static placeholder "Ask me to find or create a recipe, and it will appear here in your book." (`chat.html:89-101`), which is wrong for a book with recipes in it. Only then do the contents arrive.

- Evidence: on the phone the All / Mains / Sweets pills drop from y=92 to y=158 (66px), and first-load CLS is 0.14-0.15. A tap aimed at "Mains" in that window lands on the contents.
- Cause: `static/app.js:697-698` replaces the placeholder only after `fetchRecipeList()`, and `styles.css:2370-2381` orders the phone tab strip after `.index-title`, which does not exist until the contents render.

## What a fix needs

- Self-host the Kalam 400/700 and Libre Baskerville 400 woff2 files and preload them. Give the fallbacks `@font-face` rules with `size-adjust`, `ascent-override` and `descent-override` matched to the real fonts. Give `.user-info` a `min-width`. This needs a family-recipe-ui spec change, since that spec names Google Fonts.
- Vendor marked.js under `/static`, or pin an exact version and `defer` it. Check the frontend-xss-protection spec's assumptions about `renderMarkdown` while doing so.
- Ship a neutral loading state in `chat.html` instead of the "ask me" placeholder: the "~ Contents ~" title plus skeleton rows, so the title and tabs keep their places. Show the empty-book message only when the list really is empty.
