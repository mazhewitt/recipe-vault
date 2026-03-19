# Epic: Meal Planning Mode

**Epic ID:** RV-EP-001
**Status:** Planned
**Priority:** High

## Summary

Enable users to plan full meals around a centrepiece recipe, with AI assistance for complementary dish suggestions, dietary awareness, shopping list generation, and a guided cooking timeline.

## Background

Users of Recipe Vault often want to plan a full meal — not just cook a single recipe. Today there is no way to group recipes into a meal, aggregate a shopping list, or get a coordinated cooking guide. This epic introduces Meal Planning as a first-class concept in Recipe Vault, built chat-first with AI at the centre.

The primary creation interface is the existing AI chat. The meal plan output renders as a new document type in the right-hand recipe book panel, consistent with how individual recipes are displayed today.

---

## User Stories

---

### RV-101: Meal Assembly via Chat

**As a** home cook,
**I want to** describe a meal I'm planning in natural language,
**so that** the AI can search my recipe vault and suggest a complete, balanced meal.

#### Acceptance Criteria

| # | Given | When | Then |
|---|-------|------|------|
| AC-1 | I am in the chat interface | I mention a centrepiece recipe by name (e.g. "plan a meal around my Rogan Josh") | The AI searches the recipe vault and retrieves the named recipe |
| AC-2 | The AI has found the centrepiece recipe | The AI proposes the meal | It suggests 2–4 complementary recipes from the vault or alternatvly from the recipe search(sides, alternatives) |
| AC-3 | I mention a dietary requirement (e.g. "I have a vegetarian guest") | The AI constructs its suggestions | It includes at least one dish explicitly suitable for that dietary requirement |
| AC-4 | The AI has assembled a proposed meal | Before finalising | The AI summarises the proposed meal and asks for confirmation |
| AC-5 | The AI has proposed a meal | I reject or modify a suggestion in chat | The AI adjusts the meal plan accordingly and re-confirms |

---

### RV-102: Guest Count & Scaling Awareness

**As a** home cook planning for a group,
**I want to** specify how many guests I am cooking for,
**so that** the meal plan and shopping list reflect the right quantities.

#### Acceptance Criteria

| # | Given | When | Then |
|---|-------|------|------|
| AC-1 | I am assembling a meal in chat | I state a guest count (e.g. "for 4 people") | The meal plan records the guest count |
| AC-2 | A meal plan has a guest count | A shopping list is generated | Each ingredient quantity is scaled proportionally to the guest count relative to each recipe's default servings |
| AC-3 | A meal plan has been saved with a guest count | I reopen the meal plan | The guest count is displayed and used for any regenerated lists |

---

### RV-103: Meal Plan Panel

**As a** user who has assembled a meal in chat,
**I want to** see the meal presented as a clear visual document in the recipe book panel,
**so that** I can review and refer back to it easily.

#### Acceptance Criteria

| # | Given | When | Then |
|---|-------|------|------|
| AC-1 | A meal has been assembled in chat | The AI confirms the meal | The meal plan is rendered in the right-hand book panel |
| AC-2 | The meal plan panel is visible | I view it | It displays: meal title, guest count, and a list of recipes with their roles (centrepiece / side / vegetarian alternative) |
| AC-3 | The meal plan panel is visible | I click a recipe name | The full recipe view opens for that recipe |
| AC-4 | The meal plan panel is visible | I view the action area | Buttons are present for: "Shopping List", "Cooking Timeline", and "Save Meal" |

---

### RV-104: Shopping List Generation

**As a** home cook preparing a meal,
**I want to** generate a single aggregated shopping list from all recipes in my meal plan,
**so that** I can shop efficiently without cross-referencing each recipe individually.

#### Acceptance Criteria

| # | Given | When | Then |
|---|-------|------|------|
| AC-1 | A meal plan contains multiple recipes | I tap "Shopping List" | A shopping list is generated that includes ingredients from all recipes in the meal |
| AC-2 | Two or more recipes share an ingredient | The shopping list is generated | The ingredient appears once with quantities combined (e.g. "400g + 200g = 600g tomatoes") |
| AC-3 | A guest count is set on the meal plan | The shopping list is generated | All quantities are scaled to the guest count relative to each recipe's default servings |
| AC-4 | The shopping list is displayed | I tap an ingredient | The recipe(s) that require that ingredient are highlighted or linked |
| AC-5 | The shopping list is generated | It fails to combine quantities due to incompatible units | The ingredient appears as separate line items with their original units and source recipe labelled |

---

### RV-105: Cooking Timeline

**As a** home cook executing a multi-dish meal,
**I want to** receive a single interleaved cooking guide combining steps from all recipes,
**so that** I can coordinate everything and serve all dishes at the right time.

#### Acceptance Criteria

| # | Given | When | Then |
|---|-------|------|------|
| AC-1 | A meal plan is open | I tap "Cooking Timeline" | The AI generates an interleaved sequence of steps drawn from all recipes in the meal |
| AC-2 | I specify a target serve time (e.g. "dinner at 7pm") | The timeline is generated | Steps are reverse-scheduled from the serve time so everything finishes together |
| AC-3 | The timeline is displayed | I view a step | Each step is labelled with the source recipe name |
| AC-4 | The timeline contains passive steps (simmering, resting, marinating) | The timeline is displayed | Passive steps are visually distinguished from active/hands-on steps |
| AC-5 | No serve time is specified | I request a timeline | The timeline is generated in relative time from "start cooking" (T+0) |

---

### RV-106: Vegetarian & Dietary Awareness

**As a** host with guests of mixed dietary requirements,
**I want** the AI to flag which dishes are suitable for each dietary requirement,
**so that** I can confidently plan a meal that works for everyone.

#### Acceptance Criteria

| # | Given | When | Then |
|---|-------|------|------|
| AC-1 | A meal plan contains recipes | The meal plan panel is rendered | Each recipe is labelled with AI-inferred dietary suitability (e.g. Vegetarian ✓ / Contains meat) |
| AC-2 | A centrepiece recipe contains meat | I mention a vegetarian guest in chat | The AI proactively suggests a vegetarian alternative from the vault |
| AC-3 | The AI has inferred a dietary flag | I disagree with it | I can correct the flag via chat and the correction persists for that meal plan |
| AC-4 | No dietary requirements are mentioned | The meal plan panel is rendered | Dietary labels are still shown, derived from ingredient inference |

---

### RV-107: Save & Retrieve Meal Plans

**As a** returning user,
**I want to** save a meal plan and retrieve it later,
**so that** I can reuse meal plans for recurring occasions.

#### Acceptance Criteria

| # | Given | When | Then |
|---|-------|------|------|
| AC-1 | A meal has been assembled and confirmed | I tap "Save Meal" or ask the AI to save it | The meal plan is persisted with a name, guest count, and list of recipes |
| AC-2 | One or more meal plans have been saved | I navigate to the recipe book | A "Meals" section is visible alongside the recipe index |
| AC-3 | I open a saved meal plan | The meal plan panel renders | I can view the recipe list, guest count, and trigger shopping list / timeline regeneration |
| AC-4 | A saved meal plan is open | I request an edit (e.g. swap a recipe) via chat | The meal plan is updated and re-saved |
| AC-5 | A saved meal plan is open | I choose to delete it | The meal plan is removed and no longer appears in the Meals index |

---

## Out of Scope (v1)

- Calendar integration or date-based scheduling
- Nutritional information per meal
- Automatic grocery ordering or third-party integrations
- Multi-course structure (starter / main / dessert)
- Sharing meal plans externally (share links)
- Costing / budget estimation

---

## Delivery Phases

| Phase | Stories | Description |
|-------|---------|-------------|
| 1 | RV-101, RV-102, RV-103 | Chat-based meal assembly + Meal Plan panel |
| 2 | RV-104 | Shopping list generation |
| 3 | RV-105 | Interleaved cooking timeline |
| 4 | RV-106 | Dietary awareness & labelling |
| 5 | RV-107 | Save & retrieve meal plans |
