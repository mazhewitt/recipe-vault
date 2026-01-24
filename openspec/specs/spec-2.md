# Cooking Guidance Specification

## Purpose

The Cooking Guidance domain defines how users interact with recipes while actively cooking, including AI-powered assistance that helps them through each step.

## Requirements

### Requirement: Start Cooking Session

The system SHALL allow users to begin a cooking session for any recipe.

#### Scenario: Start cooking a recipe
- GIVEN a user has selected a recipe
- WHEN they choose to start cooking
- THEN a cooking session is created
- AND the session tracks the current step (starting at step 0)
- AND the recipe details are loaded for reference

#### Scenario: Resume interrupted session
- GIVEN a user has an active cooking session
- WHEN they return to the cooking interface
- THEN their session is restored
- AND they continue from their last active step

### Requirement: Step Navigation

The system SHALL allow users to navigate through recipe steps sequentially.

#### Scenario: Advance to next step
- GIVEN a user is on a recipe step that is not the last
- WHEN they indicate completion of the current step
- THEN the session advances to the next step
- AND the new step is displayed

#### Scenario: Return to previous step
- GIVEN a user is on a step that is not the first
- WHEN they request the previous step
- THEN the session returns to the previous step
- AND that step is displayed

#### Scenario: Complete final step
- GIVEN a user is on the last step of a recipe
- WHEN they indicate completion
- THEN the session is marked complete
- AND a completion message is displayed

### Requirement: Step Display

The system SHALL display step information clearly for kitchen use.

#### Scenario: Display step with timing
- GIVEN a step has duration information
- WHEN the step is displayed
- THEN the duration is prominently shown
- AND an option to start a timer is available

#### Scenario: Display step with temperature
- GIVEN a step has temperature information
- WHEN the step is displayed
- THEN the temperature is prominently shown
- AND the temperature unit matches the stored value

#### Scenario: Display ingredients for current step
- GIVEN a step references ingredients
- WHEN the step is displayed
- THEN relevant ingredients are shown alongside the instruction
- AND quantities and preparation notes are visible

### Requirement: AI Cooking Assistance

The system SHALL provide AI-powered guidance to help users during cooking.

#### Scenario: Request help with current step
- GIVEN a user is on a cooking step
- WHEN they ask for help or clarification
- THEN the AI provides contextual guidance based on the step
- AND the response considers the full recipe context

#### Scenario: Ask about substitutions
- GIVEN a user is cooking and missing an ingredient
- WHEN they ask about substitutes
- THEN the AI suggests appropriate alternatives
- AND explains any adjustments needed

#### Scenario: Ask timing questions
- GIVEN a user has a question about doneness or timing
- WHEN they ask the AI
- THEN the AI provides guidance on visual/texture cues
- AND suggests how to adjust for their specific situation

#### Scenario: General cooking questions
- GIVEN a user has a cooking technique question
- WHEN they ask the AI during a session
- THEN the AI answers in the context of the current recipe
- AND keeps responses concise for kitchen use

### Requirement: AI Response Format

The system SHALL ensure AI responses are appropriate for kitchen use.

#### Scenario: Response brevity
- GIVEN a user asks a question while cooking
- WHEN the AI responds
- THEN responses are concise (under 150 words by default)
- AND key information is front-loaded

#### Scenario: Step-by-step breakdown
- GIVEN a user asks about a complex technique
- WHEN the AI responds
- THEN the explanation uses numbered sub-steps if needed
- AND each sub-step is actionable

#### Scenario: Safety guidance
- GIVEN a step involves safety considerations (hot oil, raw meat, etc.)
- WHEN the AI provides guidance
- THEN relevant safety reminders are included
- AND warnings are clear but not alarmist

### Requirement: Session State Management

The system SHALL maintain session state reliably.

#### Scenario: Persist session across page refreshes
- GIVEN an active cooking session
- WHEN the page is refreshed or reconnected
- THEN the session state is preserved
- AND the user continues where they left off

#### Scenario: End session explicitly
- GIVEN an active cooking session
- WHEN the user chooses to end the session
- THEN the session is closed
- AND the user returns to the recipe view

#### Scenario: Session timeout
- GIVEN a cooking session has been inactive for 4 hours
- WHEN the user returns
- THEN the session is automatically closed
- AND the user can start a new session if desired

## Data Types

### CookingSession
```
CookingSession {
    id: UUID
    recipe_id: UUID (foreign key)
    current_step_index: u32
    started_at: DateTime
    last_activity_at: DateTime
    completed_at: Option<DateTime>
}
```

### GuidanceRequest
```
GuidanceRequest {
    session_id: UUID
    question: String
    step_context: Option<u32>  // Which step the question relates to
}
```

### GuidanceResponse
```
GuidanceResponse {
    answer: String
    suggestions: Option<Vec<String>>  // Follow-up prompts
}
```

## AI Integration Notes

The AI guidance feature uses the Claude API with the following context strategy:

1. **System prompt** includes: recipe title, full ingredient list, all steps, and the user's current position
2. **User message** contains: the user's question
3. **Response constraints**: concise, actionable, kitchen-appropriate language

The system should handle API unavailability gracefully - cooking can continue without AI assistance, with a message indicating guidance is temporarily unavailable.

## UI Considerations

- Large, readable text for kitchen viewing distance
- High contrast for visibility in various lighting
- Touch-friendly buttons for potentially wet/messy hands
- Minimal scrolling required per step
- Timer integration should be prominent when relevant
