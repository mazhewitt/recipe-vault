## Why

Recipe Vault currently stores and displays recipes but doesn't help users *cook* them. Users need assistance scaling recipes for different serving sizes, breaking down preparation into manageable phases, and timing multi-step processes. This change transforms Recipe Vault from a passive recipe manager into an active cooking assistant.

## What Changes

- AI system prompt additions for conversational cooking guidance
- New `start_timer` MCP tool to trigger cooking timers
- New `timer_start` SSE event to communicate timer data to frontend
- Frontend timer widget activation (already exists in HTML, currently hidden)
- Browser notification support for timer completion
- Recipe scaling intelligence (Claude calculates scaled quantities on the fly)

## Capabilities

### New Capabilities
- `cooking-guidance`: Conversational AI guidance for cooking recipes, including recipe scaling, phase-based instruction, and timer management

### Modified Capabilities
<!-- None - this is a new feature that doesn't change existing requirements -->

## Impact

**Backend**:
- `src/handlers/chat.rs`: System prompt additions (~500 tokens), new `TimerStart` SSE event
- `src/mcp/tools.rs`: New `start_timer` tool definition and handler

**Frontend**:
- `static/app.js`: Timer state management, countdown logic, notification handling, SSE event processing
- `static/chat.html`: Timer widget already exists (lines 20-31), just needs unhiding

**Dependencies**: None - uses existing SSE streaming infrastructure and MCP tool system
