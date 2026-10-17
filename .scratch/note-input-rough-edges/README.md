# Note input: the image chip grows the slip and will not re-attach the same photo, an empty send is silent, and send keeps its hover colour on touch

Status: needs-triage
Reported: 2026-10-17
Reporter: Claude (usability audit, openspec/changes/steady-cooking-spread/audit-summary.md)
Severity: low. Small fixes; none needs a spec change except perhaps where the chip sits.

## Description

Three findings from the audit's "ask" explorer, plus the image half of `slip-grows-over-page`.

### 1. The image chip (`image-chip`)

- **It grows the slip.** Attaching a photo with the paperclip adds an "Image attached (0.0MB)" chip that grows the slip by 53-55px. On the tablet the slip grows up over the page; on the phone the book is squeezed. steady-cooking-spread D4 keeps the slip still during a turn, but it does not cover attaching.
- **Its remove ✕ is 22x18.**
- **"(0.0MB)" reads as technical**, and looks wrong for small images.
- **The same file cannot be re-attached.** Choose a file, remove it, choose the same file again: nothing happens, no chip and no error. This happens on every viewport.

Evidence: remeasure `image-chip`: the slip grows +53px (phone) and +55px, the remove target is 22x18px, the text reads "Image attached (0.0MB)", and after removing, re-attaching the same file shows no chip on any viewport.

Cause:
- The `change` listener on `#image-upload` never resets `fileInput.value` (`static/app.js:264-268`), and neither does `removeImage` (`app.js:171-177`), so the same file fires no `change` event.
- `.remove-image` has `padding: 0 4px` (`static/styles.css:418-427`).
- The size readout is formatted in `app.js:162-168`.

### 2. An empty send is silent (`empty-send-silent`)

Tapping send, or pressing Enter, with an empty box or only spaces and newlines gives no feedback. The whitespace stays in the textarea, which may also have grown with the newlines, and the send button looks active throughout.

- Evidence: the thread stays at 2 entries and the textarea keeps "   ".
- Cause: `static/chat.js:121-124` returns early without clearing. A disabled style for the send button exists (`styles.css:344-347`) but nothing applies it.

### 3. Send keeps its hover colour on touch (`send-sticky-hover`)

On touch devices the send button keeps its `:hover` style after a tap. On the tablet it goes from cream to white. On the phone it goes from the solid leather button to a pale cream one, which reads as disabled.

- Evidence: tablet send background `rgb(245, 237, 216)` before the tap, `rgb(255, 255, 255)` after.
- Cause: `.note-send:hover` (`styles.css:335-338`) and `.clipboard-button:hover` (`:374-378`) are not wrapped in `@media (hover: hover)`, and the phone block (`:2283-2291`) sets leather without a matching `:hover`.

## What a fix needs

- Clear `#image-upload.value` in `removeImage` and after reading a file.
- Give the chip's ✕ a hit area of at least 44px.
- Show a thumbnail inline in the input row instead of the MB text, so the slip's height does not change.
- Disable send while the trimmed text is empty and no image is attached, and clear whitespace-only input on submit. steady-cooking-spread D4 adds `aria-disabled` to send while a turn runs, so share that mechanism.
- Wrap the hover rules in `@media (hover: hover) and (pointer: fine)`.
