# One-off scaling or substitution silently overwrites the family's master recipe

Status: promoted 2026-10-18 to `openspec/changes/cook-from-the-page` (P1, P2; the first-step item is P5). Archive this directory when that change is archived.
Reported: 2026-10-17
Reporter: Claude (live model eval for `openspec/changes/upgrade-gemini-models`, see its `eval-judgement.md`, scenarios `halve-current` and `hard-substitute-and-scale`)
Severity: medium. It loses family data the user didn't ask to change, and it happens with every model tested

## Description

Asked "I've got no coconut milk, only double cream. Swap it in and make it for 6
people" with the curry open, **all five Gemini candidates** called `update_recipe`.
That permanently replaced the coconut milk with 600 ml double cream and set
servings to 6, without saying the stored recipe had changed and without warning
that a 1:1 cream swap makes a very rich curry. "Can you halve this recipe? Just two
of us tonight" was split: some models presented the halved list and left the book
alone, others saved servings 2.

The intent is genuinely ambiguous, and the codebase points both ways:
- `openspec/specs/cooking-guidance/spec.md` "Recipe scaling": the system "calculates
  and **presents** halved quantities". That reads as a presentation, not an edit.
- `src/ai/prompts.rs:113-117` says "Present the complete scaled ingredient list".
- The mock LLM, the e2e suite and the margin-note refresh path treat "halve" as
  `update_recipe` (`src/ai/llm.rs`, mock branch `halve`/`update`). The UI was
  designed around saving.

## Decision needed

Should a cooking-time adjustment (scale, swap an ingredient for tonight) change the
stored family recipe?

- **A. Never, unless asked to save.** Present the adjusted quantities. Offer
  "Save this as the new version?". The prompt gets one rule, and the mock/e2e
  "halve" path moves to an explicit "save it for 2" phrasing.
- **B. Yes, but say so.** Keep saving. The reply must state what changed in the
  book, and the UI could offer an undo (needs a recipe version or undo
  endpoint).
- **C. Scale on the page without touching the record.** A servings stepper in
  cook mode rescales the displayed quantities client-side. This is the cookbook
  convention, and the AI is not needed for it.

Recommendation: C for scaling (no AI round-trip, nothing to lose) plus A for
substitutions.

## Also seen in the same eval (prompt, not model)

At "Let's cook this together. I'm at the stove, what first?" no model gave the
first instruction. Each one asked about servings first, because the
cooking-guidance spec's session-start rule asks for servings. For a cook with
busy hands, the first step should come first and the servings question second.

## Decision (owner, 2026-10-18)

**C for scaling, plus A for substitutions** (the recommendation above):
- A servings stepper on the page scales the displayed quantities for the session; the saved recipe is untouched (design P1).
- The assistant scales through a new page tool, `set_servings`, plumbed like `start_timer` with no database write. Substitutions and other one-off changes are presented in the reply with "Want me to save this as a change to the recipe?", and `update_recipe` is called only on a yes or an explicit request (P2). The mock's "halve" path moves to `set_servings`; "update"/"save" keeps saving.
- "Also seen": the cooking session opens with the first step and names the page's servings in one line, instead of asking for servings first (P5).

Promoted to `openspec/changes/cook-from-the-page`.

## Comments
