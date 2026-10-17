## ADDED Requirements

### Requirement: Lost-history notice only for lost conversations

The chat handler SHALL tell the AI that history was lost only when the browser resumes a conversation the server no longer holds. A brand-new conversation SHALL carry no such notice.

#### Scenario: First message of a new chat
- **WHEN** a chat request arrives without a `conversation_id`
- **THEN** the conversation sent to the LLM SHALL NOT contain a notice that the conversation was reset
- **AND** the AI's reply does not open by apologising for a reset that never happened

#### Scenario: Server lost the conversation
- **WHEN** a chat request carries a `conversation_id` the server does not hold (expired, pruned, or the server restarted)
- **THEN** the conversation sent to the LLM SHALL begin with a notice that the prior history is unavailable
- **AND** the AI can briefly say it is continuing from here

#### Scenario: Known conversation
- **WHEN** a chat request carries a `conversation_id` the server holds
- **THEN** no notice SHALL be added
