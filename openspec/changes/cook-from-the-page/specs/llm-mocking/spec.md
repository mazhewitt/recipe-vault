## ADDED Requirements

### Requirement: Mock separates scaling from saving

The mock provider SHALL answer a note asking to halve the open recipe with a `set_servings` call, and a note asking to update or save it with an `update_recipe` call, so the e2e suite can drive both paths without a real provider.

#### Scenario: "halve" scales the page
- **WHEN** the last user message contains "halve" (case-insensitive) and its current-recipe context carries a displayed servings value N
- **THEN** the mock calls `set_servings` with ceil(N ÷ 2), at least 1: 4 for N = 8, 2 for N = 3, 1 for N = 1
- **AND** after the tool result it replies with text naming the new servings, for example "Showing 4 servings on the page — the saved recipe is unchanged."
- **AND** it makes no `update_recipe` call

#### Scenario: "halve" without servings
- **WHEN** the last user message contains "halve" and the current-recipe context carries no servings value
- **THEN** the mock replies with text only and calls no tool

#### Scenario: "update" or "save" still saves
- **WHEN** the last user message contains "update" or "save" and not "halve"
- **THEN** the mock calls `update_recipe` on the open recipe with servings 2, as before, so the refresh-in-place path keeps its trigger
