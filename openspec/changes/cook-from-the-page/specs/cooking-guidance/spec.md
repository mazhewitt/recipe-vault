## MODIFIED Requirements

### Requirement: Cooking session initiation
When a user starts cooking a recipe, the system SHALL give the first step of the method straight away and SHALL NOT open with a question. The reply SHALL end with one line naming the servings the page shows, and if the cook gives a number of servings at any point the system SHALL call `set_servings` with it.

#### Scenario: User requests cooking guidance
- **WHEN** the user says "let's cook", "I'm at the stove, what first?", "guide me through cooking this" or similar while recipe R is displayed and the page shows N servings
- **THEN** the reply opens with step 1's instruction, before any question
- **AND** it ends with one line naming the N servings the page shows, for example "(Going by 8 servings, as the page shows; change it at the top if you're cooking for fewer.)"
- **AND** the reply does not ask "How many servings are you cooking for?"

#### Scenario: The cook gives a number of servings
- **WHEN** during a cooking session the user says how many they are cooking for ("just two of us", "make it for 6")
- **THEN** the system calls `set_servings` with that number, and the guidance continues from where it was

#### Scenario: Prompt rule for the session start
- **WHEN** the chat system prompt (`src/ai/prompts.rs`) and the long-conversation reminder (`src/ai/client.rs`) are built
- **THEN** neither tells the model to ask for servings first
- **AND** the system prompt tells the model to open a cooking session with step 1's instruction and end with one line naming the servings the page shows

#### Scenario: User requests cooking guidance without recipe context
- **WHEN** user says "help me cook" without a recipe displayed
- **THEN** system asks which recipe they want to cook

### Requirement: Recipe scaling
The system SHALL scale a recipe for tonight on the page, never in the saved recipe: the cook's servings stepper (family-recipe-ui "A servings stepper scales the page") or the assistant's `set_servings` tool sets the servings the page shows, and the page rescales the displayed ingredient quantities with the stepper's rounding rules. Scaling SHALL NOT call `update_recipe` unless the cook asks to change the saved recipe.

#### Scenario: Scale recipe to fewer servings
- **WHEN** an 8-serving recipe is displayed and the user says "halve it", "just two of us tonight" or "make it for 4"
- **THEN** the model calls `set_servings` with 4, 2 or 4 respectively, and does not call `update_recipe`
- **AND** the reply says the page now shows that many servings and that the saved recipe is unchanged

#### Scenario: Scale recipe to more servings
- **WHEN** a 4-serving recipe is displayed and the user says "make it for 6"
- **THEN** the model calls `set_servings` with 6, and the page shows 500 g as 750 g

#### Scenario: The saved recipe is unchanged by scaling
- **WHEN** the page has been scaled by the stepper or by `set_servings`
- **THEN** `GET /api/recipes/<id>` returns the recipe's original `servings` and ingredient quantities

#### Scenario: Scale with unit conversion
- **WHEN** scaling gives an awkward quantity
- **THEN** the page rounds it by its own unit with family-recipe-ui "Scaled quantities are rounded for reading" and never converts between units: 1 tsp on an 8-serving recipe scaled to 12 reads "1½ tsp", and 900 ml scaled from 8 to 7 reads "790 ml"

#### Scenario: Scale with fractional display
- **WHEN** a scaled cup, spoon or unitless count is not a whole number
- **THEN** the page shows it with ¼, ½ or ¾ ("¾ tbsp", "4½ eggs"), never as a decimal

#### Scenario: Saving new servings on request
- **WHEN** the user says "update the servings in the book to 6" or "save it for 6"
- **THEN** the model calls `update_recipe` with servings 6

#### Scenario: Prompt replaces the scaled-list guidance
- **WHEN** the chat system prompt is built
- **THEN** it maps "make it for 6", "halve it" and "just two of us" to `set_servings`
- **AND** it no longer tells the model to present a complete scaled ingredient list in chat

### Requirement: The cook can keep their place in a recipe
The system SHALL let the cook tick off ingredients and mark the method step they are on, without moving anything on the page, and SHALL remember both, and the servings the page shows, per recipe for the browser session. The step mark SHALL be visible at a glance, a ticked ingredient SHALL stay readable, and clearing the ticks SHALL never clear the step mark or the servings and SHALL be undoable for a few seconds.

#### Scenario: Ticking an ingredient
- **WHEN** the cook taps an ingredient line (`.ingredient-item`)
- **THEN** it gets `data-ticked="true"` and is drawn struck through, with a small check mark in its left gutter, and its text's computed `opacity` is at least 0.6
- **AND** its bounding box is unchanged (tolerance 1px), the check mark included
- **AND** tapping it again removes the tick

#### Scenario: Marking the current step
- **WHEN** the cook taps a method step (`.prep-step`), anywhere but its `.step-duration`
- **THEN** it gets `aria-current="step"`, drawn as a 4px-wide bar in the leather red in the step's left gutter, spanning the step's height, and a faint warm tint behind the step (a computed `background-color` different from an unmarked step's)
- **AND** its bounding box is unchanged (tolerance 1px)
- **AND** any other step loses its mark, so at most one step carries `aria-current="step"`
- **AND** tapping the marked step again clears the mark

#### Scenario: The mark and the timer highlight coexist
- **WHEN** the marked step is also the step a running timer belongs to
- **THEN** the step carries both `aria-current="step"` and the `timer-active` class, and both are visible: the gutter bar is not covered by the "timer running" tag

#### Scenario: Remembered per recipe for the session
- **WHEN** the cook ticks ingredients, marks a step and sets the stepper to N on recipe A, then turns to recipe B and back, switches spread mode, or reloads the page and opens A again
- **THEN** A shows the same ticks, the same marked step and N servings, read from `sessionStorage['rv-place:<A's id>']`
- **AND** B shows only its own ticks, mark and servings

#### Scenario: Ticks survive a change of servings
- **WHEN** ingredients 1 and 3 are ticked and the cook changes the servings
- **THEN** ingredients 1 and 3 are still ticked, in the page and in `rv-place:<id>`

#### Scenario: Clearing the ticks
- **WHEN** at least one ingredient is ticked on the displayed recipe
- **THEN** a "Clear ticks" control (`.clear-ticks`) is shown in the ingredients header (on the phone, where the panels carry no header, at the end of the meta line); it passes family-recipe-ui's 44×44 hit-area test, and its appearance does not change the height of the row that holds it
- **AND** activating it removes every tick of that recipe and leaves the step mark (`aria-current="step"`), the servings shown and their stored values in `rv-place:<id>` untouched

#### Scenario: Clear ticks is hidden while nothing is ticked
- **WHEN** no ingredient is ticked on the displayed recipe, including when a step is marked
- **THEN** `.clear-ticks` is not displayed (other than as "Undo" in the 6 seconds after a clear)

#### Scenario: A clear can be undone
- **WHEN** the cook activates "Clear ticks"
- **THEN** the same control reads "Undo" for 6 seconds, with the same bounding box (tolerance 1px)
- **AND** activating it within those 6 seconds restores exactly the ticks that were cleared, in the page and in `rv-place:<id>`
- **AND** after 6 seconds without a tap the control is hidden and the clear stands

#### Scenario: A scroll is not a tap
- **WHEN** a touch drag that starts on an ingredient line or a method step scrolls the page
- **THEN** nothing is ticked or marked, because ticks and marks respond to `click`, never to `touchstart`

#### Scenario: Ignored while a page turns
- **WHEN** the cook taps an ingredient or a step while a page-turn or crossfade animation holds the lock
- **THEN** nothing is ticked or marked

#### Scenario: Ticks on the phone
- **WHEN** a recipe is displayed on a viewport 600px wide or narrower
- **THEN** tapping an item on the Ingredients tab ticks it and tapping a step on the Method tab marks it, as on the wider book

## ADDED Requirements

### Requirement: The saved recipe changes only when the cook asks
During cooking, a substitution or other one-off change for tonight SHALL be presented in the reply with an offer to save, and the system SHALL call `update_recipe` only after the cook says yes, or when the cook explicitly asks to change or save the recipe.

#### Scenario: A substitution for tonight
- **WHEN** the curry (with coconut milk) is displayed and the user says "I've got no coconut milk, only double cream. Swap it in."
- **THEN** the reply presents the adjusted ingredient and any method change, flags the notable effect (a 1:1 double cream swap makes it much richer), and ends with "Want me to save this as a change to the recipe?"
- **AND** no `update_recipe` call is made in that turn

#### Scenario: The cook accepts the offer
- **WHEN** the previous reply offered to save a change and the user answers "yes"
- **THEN** the model calls `update_recipe` with the change

#### Scenario: An explicit request to change the recipe
- **WHEN** the user says "change the recipe to use cream" or "save it with cream"
- **THEN** the model calls `update_recipe` without offering first

#### Scenario: Substitution and scaling together
- **WHEN** the user says "swap in double cream and make it for 6"
- **THEN** the model calls `set_servings` with 6, presents the substitution in the reply with the offer to save, and calls no `update_recipe`
