# The notes thread is lost on reload, unreachable from the phone's contents page, and a turn that opens a page files its reply out of sight

Status: needs-triage
Reported: 2026-10-17
Reporter: Claude (usability audit, openspec/changes/steady-cooking-spread/audit-summary.md)
Severity: medium. Conversation the cook asked for disappears or cannot be found again.

## Description

Three findings from the audit's "ask" explorer, all about where the thread lives.

### 1. Reload empties the thread (`thread-lost-on-reload`)

A reload, or iPad Safari discarding a backgrounded tab while the cook is away, empties the margin and the Notes view. That includes any substitutions the assistant suggested for the recipe.

- Evidence: thread entries went from 2 to 0 after a reload, on every viewport.
- Cause: the thread is a module-level `const thread = []` (`static/margin-notes.js:26`), and `conversationId` is not persisted either (`static/app.js:18`).
- Both book-spread-modes and steady-cooking-spread list persistence as a non-goal.
- Once safe-page-navigation N5 lands, the recipe survives a reload but its notes still do not.

### 2. The phone cannot read earlier book-level notes (`phone-book-thread-unreachable`)

Notes sent from the phone's contents page are filed on the book thread. The contents page shows only the latest one, as a sticky, and has no Notes tab.

- Evidence: 4 book entries, 1 shown, Notes tab visible = false.
- Cause: `static/styles.css:2204-2206` hides `.page-tabs` on the contents page, and `static/spread-modes.js:91` refuses spread modes on the phone, so the strip's Notes tab does not exist there.
- This violates web-chat "Notes view with no recipe open".

### 3. A turn that opens a page files its reply out of sight (`reply-filed-out-of-sight`)

- **"show me the lasagne" from the contents.** The lasagne opens with an empty margin. The reply ("I've pulled up the recipe…") is filed on the book thread and only shows if the cook goes back to the contents.
- **"plan a meal" from a recipe.** The reply is filed under that recipe. The meal plan page shows whatever older book note exists: in the explorer's run, a stale "Using tool: display_recipe / I've pulled up the recipe…".
- Evidence: remeasure `reply-filed-out-of-sight`, 0 notes on the opened recipe (phone and tablet), and an empty meal-plan margin.
- Cause: `static/chat.js:133-135` stamps the turn with the recipe on display when the note was sent, and `margin-notes.js:112-121` shows only the displayed recipe's entries.
- steady-cooking-spread keeps these scoping rules for its new reply sticky, so this remains after that change. See its design.md open question 3.

## What a fix needs

- Item 1: decide between persisting the thread per recipe in `sessionStorage` and rehydrating it from the server conversation.
- Item 2: a Notes paper tab, or a button, on the phone's contents page that renders `renderThread()` for the book thread.
- Item 3: show the in-flight turn's reply on the page it opened, while still filing it under the turn's recipe. Give meal plans their own thread id: open decision 5 in `.scratch/book-spread-modes-follow-ups/02-open-decisions.md`, tied to RV-107.
- Items 1 and 3 change web-chat ("Notes are scoped to the recipe they were written under" needs an exception for the in-flight turn), so this probably becomes an OpenSpec change.
