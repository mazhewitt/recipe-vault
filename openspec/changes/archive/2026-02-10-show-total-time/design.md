## Context

The recipe UI already renders optional metadata (difficulty, servings, prep time, cook time) and hides missing fields. Some recipes include step durations, but the total time is not surfaced. We want a derived total time shown next to difficulty without altering the underlying recipe storage schema.

## Goals / Non-Goals

**Goals:**
- Compute a total time value from available timing fields (step durations and/or prep/cook times) at render time.
- Display total time alongside existing metadata, using the same optional rendering rules.
- Keep UI changes scoped to the recipe book metadata area.

**Non-Goals:**
- No changes to database schema or stored recipe fields.
- No changes to AI difficulty assessment or timing extraction logic.
- No redesign of metadata icons beyond adding the total time element.

## Decisions

- **Compute total time client-side from the recipe payload.**
  - Rationale: The API already returns step durations and prep/cook times. Deriving at render time avoids schema changes and keeps the feature additive.
  - Alternative: Add a server-calculated total field. Rejected for increased schema and migration overhead.

- **Prefer explicit prep/cook times when present; otherwise fall back to summed step durations.**
  - Rationale: Prep/cook fields represent author intent and avoid double counting when steps include timing that overlaps with prep/cook.
  - Alternative: Always sum steps. Rejected because many recipes omit step durations or include overlapping timing.

- **Render total time only when a valid total is available.**
  - Rationale: Matches existing optional metadata behavior and avoids empty UI chrome.

## Risks / Trade-offs

- **[Ambiguous timing inputs]** → **Mitigation:** Document precedence rules and keep logic simple (prefer prep/cook, fallback to steps).
- **[Inconsistent step durations]** → **Mitigation:** Treat missing or non-numeric durations as zero and only display totals when positive.
