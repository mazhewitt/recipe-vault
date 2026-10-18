## Purpose
Guided cooking mode: session initiation, scaling, phase-based guidance and timers driven by the AI agent.

## Requirements

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

### Requirement: Phase-based guidance
The system SHALL break recipes into logical cooking phases (not micro-steps) appropriate for experienced cooks, waiting for user confirmation before advancing to the next phase.

#### Scenario: Multi-phase cooking flow
- **WHEN** guiding through a recipe with distinct preparation stages
- **THEN** system presents phases like "Phase 1: Prep ingredients", "Phase 2: Marinate", "Phase 3: Cook" and waits for user to indicate completion

#### Scenario: User confirms phase completion
- **WHEN** user says "done", "finished", or "ready" after a phase
- **THEN** system advances to the next phase

#### Scenario: Adaptive guidance level
- **WHEN** presenting cooking instructions
- **THEN** system assumes user competence and avoids micro-managing (e.g., "Mix marinade" not "Get a bowl. Add ingredient 1. Add ingredient 2...")

### Requirement: Timer offering
The system SHALL proactively suggest timers for waiting periods (marinating, simmering, resting, baking) during cooking guidance.

#### Scenario: Suggest timer for waiting period
- **WHEN** a cooking phase involves passive waiting (e.g., "marinate for 30 minutes")
- **THEN** system offers to start a timer

#### Scenario: User accepts timer
- **WHEN** user agrees to a suggested timer
- **THEN** system calls start_timer tool with duration and descriptive label

### Requirement: Timer tool
The system SHALL provide a start_timer MCP tool that accepts duration, label and an optional 1-based method step number, returning timer metadata for frontend execution.

#### Scenario: Start timer tool invocation
- **WHEN** AI calls start_timer with duration_minutes and label
- **THEN** tool returns timer_id and confirmation message

#### Scenario: Start timer with a step number
- **WHEN** AI calls start_timer with duration_minutes, label and step_number
- **THEN** tool returns timer_id, confirmation message and the same step_number

#### Scenario: Invalid step number is rejected
- **WHEN** AI calls start_timer with a step_number of 0 or a non-integer value
- **THEN** tool returns an invalid params error and no timer is started

#### Scenario: Timer event emission
- **WHEN** start_timer tool is called successfully
- **THEN** system emits timer_start SSE event with duration_minutes and label
- **AND** the event includes step_number when the tool was called with one, and omits the field otherwise

#### Scenario: Prompt guidance for step numbers
- **WHEN** the guided-cooking system prompt is built
- **THEN** it instructs the model to pass step_number when the waiting period belongs to a specific numbered step of the recipe

### Requirement: Frontend timer execution
The system SHALL display a countdown timer in the UI when a timer is started — by a timer_start event or by tapping a step's duration — showing remaining time and completing with an audible alert that repeats and a finished state that stays until the cook acknowledges it, and SHALL highlight the method step the timer belongs to while it is running on the recipe it was started from, without changing the size or position of that step or any other.

#### Scenario: Timer countdown display
- **WHEN** frontend receives timer_start SSE event
- **THEN** timer widget becomes visible and displays countdown (M:SS format)
- **AND** `#timer-widget` has `data-state="running"`

#### Scenario: The pill names its step
- **WHEN** a timer is running
- **THEN** `#timer-widget .timer-label` reads "Step N" for a timer started from step N's duration, "Step N · <label>" for an assistant timer with step_number N, and "<label>" for an assistant timer with no step
- **AND** `#timer-widget .timer-time` holds only the remaining time, so the pill's text reads "Step 2 · 7:42" (label, separator, time) and never "Step 2:7:42"

#### Scenario: Timer completion notification
- **WHEN** timer countdown reaches zero
- **THEN** the pill switches to its finished state: `#timer-widget[data-state="done"]` and its text reads "Done · <label>"
- **AND** the pill is filled with the leather red (a `--leather` family token) behind cream text, so its computed `background-color` differs from the running pill's
- **AND** a three-note chime plays through the Web Audio API, generated by an oscillator so no audio file is loaded (three `OscillatorNode.start()` calls)
- **AND** `navigator.vibrate([200, 100, 200])` is called where `navigator.vibrate` exists
- **AND** the browser notification with the timer label is still shown when notification permission was granted
- **AND** any step highlight for that timer is removed

#### Scenario: The chime repeats until acknowledged
- **WHEN** the pill is in its finished state and is not tapped
- **THEN** the chime (three `OscillatorNode.start()` calls) plays again every 15 seconds after zero (at 15s, 30s, 45s, …), each time with the vibration where `navigator.vibrate` exists
- **AND** the repeats stop by themselves 5 minutes after zero: with the page clock advanced to 10 minutes after zero, no chime has started after the 300-second mark
- **AND** a tap on the pill or its ✕ stops the repeats at once: no chime starts after the tap

#### Scenario: The finished pill pulses without moving
- **WHEN** the pill is in its finished state
- **THEN** it pulses with a CSS animation that changes only `opacity` or `box-shadow`, so its bounding box is the same on every animation frame (tolerance 1px)
- **AND** under `prefers-reduced-motion: reduce` the computed `animation-name` of `#timer-widget` is `none`

#### Scenario: The finished state stays until tapped
- **WHEN** the pill is in its finished state
- **THEN** it is still displayed 60 seconds later, and still displayed after the chime has stopped at 5 minutes
- **AND** a tap anywhere on the pill, its ✕ included, hides it

#### Scenario: Audio is unlocked by the first gesture
- **WHEN** the cook first taps, clicks or presses a key anywhere in the page
- **THEN** the page creates its `AudioContext`, or resumes it if it is suspended, inside that gesture
- **AND** where Web Audio is unavailable, or the context cannot be created or resumed, a finishing timer still shows its finished state and no error is thrown

#### Scenario: Single active timer
- **WHEN** a new timer is started by a timer_start event while one is already running, or while a finished timer is waiting to be acknowledged
- **THEN** system replaces the previous timer with the new one
- **AND** the previous timer's step highlight is replaced by the new timer's highlight (or removed if the new timer has no step)
- **AND** a timer started from a step's duration replaces a running one only on a confirming second tap ("A step's duration starts its timer")

#### Scenario: Timer manual cancellation
- **WHEN** user clicks cancel/dismiss button on timer widget
- **THEN** timer stops counting and widget is hidden
- **AND** any step highlight for that timer is removed

#### Scenario: Step is highlighted while the timer runs
- **WHEN** a timer_start event with step_number N is received while recipe R is displayed
- **THEN** the method step with data-step N on the displayed recipe gets the `timer-active` class: a pale background band and an inset box-shadow, a clock mark in its left margin, and a small "timer running" tag positioned absolutely in the step's left gutter
- **AND** the step's `getBoundingClientRect()` is identical with and without the highlight (tolerance 1px), so no later step moves when the timer starts, finishes or is cancelled
- **AND** the frontend records that the timer belongs to recipe R

#### Scenario: Highlight is re-applied on re-render
- **WHEN** a timer with a step is running for recipe R and recipe R is rendered again within the same page session (for example navigating away and back)
- **THEN** the same step is highlighted again after rendering

#### Scenario: No highlight without a step or on another recipe
- **WHEN** a timer is running with no step_number, or a recipe other than the one the timer was started from is displayed
- **THEN** no method step carries the timer highlight

#### Scenario: Timer does not survive a page reload
- **WHEN** the page is reloaded while a timer is running
- **THEN** no timer pill is shown and no method step carries the timer highlight

### Requirement: Conversational context retention
The system SHALL remember cooking progress through conversation history, allowing users to ask questions mid-cooking without losing their place.

#### Scenario: Mid-cooking question
- **WHEN** user asks a question during cooking (e.g., "what temperature again?")
- **THEN** system answers the question and remembers current cooking phase

#### Scenario: Resume after interruption
- **WHEN** user returns to cooking guidance after an unrelated question
- **THEN** system continues from the last acknowledged phase

### Requirement: The screen stays awake while cooking
The system SHALL hold a screen wake lock while a recipe or a meal plan is displayed, and SHALL release it when the contents page is shown. Where the Screen Wake Lock API is unsupported or refused, the page SHALL behave as before.

#### Scenario: Lock taken when a recipe opens
- **WHEN** a recipe or a meal plan is displayed
- **THEN** `navigator.wakeLock.request('screen')` is called and the returned sentinel is held

#### Scenario: Lock kept while paging
- **WHEN** the cook turns from one recipe to the next while the lock is held
- **THEN** the lock is not released and no second request is made

#### Scenario: Lock released on the contents
- **WHEN** the contents page is shown
- **THEN** the held sentinel's `release()` is called

#### Scenario: Lock re-acquired on return
- **WHEN** the page becomes visible again (`visibilitychange` to `visible`) while a recipe or meal plan is displayed
- **THEN** `navigator.wakeLock.request('screen')` is called again

#### Scenario: Unsupported or refused
- **WHEN** `navigator.wakeLock` does not exist, or `request()` rejects
- **THEN** no error reaches the console and nothing on the page changes

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

### Requirement: A step's duration starts its timer
Each method step with a duration SHALL render that duration as a button which starts a timer for that step locally, without a request to the assistant, and which shows it does so with a small clock before the time. It SHALL never replace a running timer by accident.

#### Scenario: The duration is a button
- **WHEN** a recipe is displayed whose step n has `duration_minutes` N
- **THEN** that step contains `button.step-duration[type="button"]` reading "N min", with `aria-label="Start a N minute timer for step n"`
- **AND** it keeps its chip look, with a clock drawn as its background image before the time, at a 15px font-size (14px at the desk: family-recipe-ui "Recipe text is sized for reading from the counter"), and passes family-recipe-ui's 44×44 hit-area test at every breakpoint
- **AND** the step's bounding box is the one a `span.step-duration` with the same text and class gives it (tolerance 1px)

#### Scenario: Tapping it starts a local timer
- **WHEN** no timer is running or waiting to be acknowledged and the cook taps step n's `.step-duration`
- **THEN** a timer for N minutes starts through the same `startTimer` path a `timer_start` event uses: the pill shows "Step n" and the time, step n gets the `timer-active` highlight, and the chime and wake lock behave as for any timer
- **AND** no request to `/api/chat` is made
- **AND** step n's `aria-current` does not change

#### Scenario: A running timer is not replaced by one tap
- **WHEN** a timer is running and the cook taps a `.step-duration`
- **THEN** the running timer keeps counting and its highlight stays
- **AND** the pill reads "Tap again to replace" for 4 seconds, with the same bounding box as before (tolerance 1px), and the tapped button gets `data-confirm`
- **AND** a second tap on the same button within those 4 seconds replaces the timer with the tapped step's timer and removes `data-confirm`
- **AND** after 4 seconds without a second tap the pill shows the running timer again and `data-confirm` is removed

#### Scenario: A finished timer is replaced at once
- **WHEN** the pill is in its finished state and the cook taps a `.step-duration`
- **THEN** the finished timer is acknowledged (its chime repeats stop) and the tapped step's timer starts, with no confirmation

#### Scenario: Duration buttons are inert during a page turn
- **WHEN** the cook taps a `.step-duration` while a page-turn or crossfade animation holds the lock
- **THEN** no timer starts

### Requirement: The running pill leads to its step
Tapping a running timer pill, other than its ✕, SHALL bring the cook to the step the timer belongs to.

#### Scenario: Timer's recipe is open
- **WHEN** a timer for step n of recipe R is running, R is displayed, step n is scrolled out of view, and the cook taps `#timer-widget` outside `.timer-cancel`
- **THEN** the scroll container of the method (`#page-right`; on the phone after switching to the Method tab) scrolls so `.prep-step[data-step="n"]` is wholly visible
- **AND** nothing but that container's `scrollTop` (and, on the phone, the active tab) changes: `#note-input`, `#message-input` and `#timer-widget` keep their bounding boxes (tolerance 1px)

#### Scenario: Another recipe is open
- **WHEN** a timer for step n of recipe R is running, recipe S or the contents is displayed, and the cook taps the running pill
- **THEN** recipe R is opened the way a contents row opens it, and then step n is scrolled into view as above
- **AND** the timer keeps counting through the page turn

#### Scenario: A timer with no step
- **WHEN** a running timer has no step and the cook taps the pill
- **THEN** nothing changes

#### Scenario: Finished pill still dismisses
- **WHEN** the pill is in its finished state and the cook taps it
- **THEN** it is hidden and no navigation or scrolling happens

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
