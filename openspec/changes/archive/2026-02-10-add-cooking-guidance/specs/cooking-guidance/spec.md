## ADDED Requirements

### Requirement: Cooking session initiation
When a user requests cooking guidance for a recipe, the system SHALL initiate a cooking session by retrieving the recipe and asking for serving size.

#### Scenario: User requests cooking guidance
- **WHEN** user says "guide me through cooking this" or similar while viewing a recipe
- **THEN** system retrieves the recipe context and asks "How many servings are you cooking for?"

#### Scenario: User requests cooking guidance without recipe context
- **WHEN** user says "help me cook" without a recipe displayed
- **THEN** system asks which recipe they want to cook

### Requirement: Recipe scaling
The system SHALL scale recipe ingredient quantities based on user-specified serving size, using intelligent unit conversions and practical measurements.

#### Scenario: Scale recipe to fewer servings
- **WHEN** user specifies 2 servings for a 4-serving recipe
- **THEN** system calculates and presents halved quantities (e.g., "2 cups flour" becomes "1 cup flour")

#### Scenario: Scale with unit conversion
- **WHEN** scaling results in awkward quantities
- **THEN** system converts to practical units (e.g., "1.5 tsp" becomes "1½ tsp or ½ tbsp")

#### Scenario: Scale with fractional display
- **WHEN** scaling results in common fractions
- **THEN** system displays as fractions (e.g., "0.33 cups" becomes "⅓ cup")

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
The system SHALL provide a start_timer MCP tool that accepts duration and label, returning timer metadata for frontend execution.

#### Scenario: Start timer tool invocation
- **WHEN** AI calls start_timer with duration_minutes and label
- **THEN** tool returns timer_id and confirmation message

#### Scenario: Timer event emission
- **WHEN** start_timer tool is called successfully
- **THEN** system emits timer_start SSE event with duration_minutes and label

### Requirement: Frontend timer execution
The system SHALL display a countdown timer in the UI when timer_start event is received, showing remaining time and completing with a notification.

#### Scenario: Timer countdown display
- **WHEN** frontend receives timer_start SSE event
- **THEN** timer widget becomes visible and displays countdown (MM:SS format)

#### Scenario: Timer completion notification
- **WHEN** timer countdown reaches zero
- **THEN** system shows browser notification with timer label and plays completion alert

#### Scenario: Single active timer
- **WHEN** a new timer is started while one is already running
- **THEN** system replaces the previous timer with the new one

#### Scenario: Timer manual cancellation
- **WHEN** user clicks cancel/dismiss button on timer widget
- **THEN** timer stops counting and widget is hidden

### Requirement: Conversational context retention
The system SHALL remember cooking progress through conversation history, allowing users to ask questions mid-cooking without losing their place.

#### Scenario: Mid-cooking question
- **WHEN** user asks a question during cooking (e.g., "what temperature again?")
- **THEN** system answers the question and remembers current cooking phase

#### Scenario: Resume after interruption
- **WHEN** user returns to cooking guidance after an unrelated question
- **THEN** system continues from the last acknowledged phase
