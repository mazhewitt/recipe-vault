## Context

Recipe Vault has a conversational AI chat interface that uses MCP tools to manage recipes. The chat handler streams responses via Server-Sent Events (SSE) and already supports tool use indicators and recipe artifact events. A timer widget exists in the HTML but is currently hidden. Users want cooking assistance beyond just viewing recipes - they need help scaling recipes, breaking down cooking into phases, and managing timing.

**Current State:**
- SSE streaming infrastructure exists (`SseEvent` enum in chat.rs)
- MCP tool system handles recipe CRUD operations
- System prompt instructs AI on recipe management
- Timer widget HTML present but unused (chat.html:20-31)
- Conversation history maintained in memory per session

**Constraints:**
- Keep MVP simple - avoid over-engineering
- Users are experienced cooks - no micro-management needed
- Mobile-responsive design required
- No database changes needed

## Goals / Non-Goals

**Goals:**
- Enable conversational cooking guidance with recipe scaling
- Support cooking timers triggered by AI and executed in browser
- Minimal complexity - ship fast, iterate based on real usage
- Leverage Claude's existing intelligence for scaling math

**Non-Goals:**
- Multiple simultaneous timers (start with single timer MVP)
- Timer persistence across page refreshes
- Explicit "cooking mode" state management
- Backend recipe scaling logic
- Voice input/output

## Decisions

### Decision 1: System Prompt vs MCP Tool for Cooking Mode

**Choice:** Add cooking guidance directly to system prompt

**Rationale:**
- Simpler implementation - no new tool, no extra round-trip
- Natural conversation flow - user just says "help me cook this"
- Token cost negligible (~500 tokens ≈ $0.0001 per message)
- Claude can proactively suggest cooking mode when appropriate

**Alternative Considered:** MCP tool `start_cooking_session` that returns cooking instructions as tool result
- Pros: Cleaner system prompt, extensible for future "modes"
- Cons: Extra complexity, requires round-trip, adds ceremony to conversation
- Why rejected: MVP principle - can refactor later if system prompt bloat becomes an issue

### Decision 2: Recipe Scaling Implementation

**Choice:** Let Claude calculate scaled quantities using its mathematical reasoning

**Rationale:**
- Claude is excellent at math and unit conversions
- No backend logic needed - reduces code complexity
- AI can present scaled ingredients naturally in conversation
- Handles edge cases intelligently (fractional display, unit conversion)

**Alternative Considered:** Backend `scale_recipe` MCP tool with hardcoded conversion logic
- Pros: Consistent calculations, no hallucination risk
- Cons: More code, less flexible, loses Claude's natural language strengths
- Why rejected: Claude's intelligence is the product differentiator here

### Decision 3: Timer Architecture

**Choice:** MCP tool signals → SSE event → Frontend JavaScript execution

**Flow:**
```
AI suggests timer
  ↓
AI calls start_timer(duration_minutes, label)
  ↓
Tool returns timer_id
  ↓
Chat handler emits timer_start SSE event
  ↓
Frontend JS receives event, starts setInterval countdown
  ↓
Browser Notification API alerts when complete
```

**Rationale:**
- Follows existing pattern (recipe_artifact events)
- Timers run in browser (no server state needed)
- Works with existing SSE infrastructure
- Browser notifications provide native OS integration

**Alternative Considered:** WebSocket bidirectional communication for timer updates
- Why rejected: SSE already works, no need for bidirectional channel

### Decision 4: Single Timer Simplicity

**Choice:** Support only one active timer at a time (replace on new start)

**Rationale:**
- MVP - test if users even need timers before building multi-timer complexity
- Matches most common use case (one active waiting period)
- Simpler UI and state management
- Can expand to multiple timers if users request it

### Decision 5: No Timer Persistence

**Choice:** Timers reset on page refresh

**Rationale:**
- Simpler implementation (no localStorage, no server state)
- Cooking sessions are typically uninterrupted
- If users refresh, they can just ask AI "where were we?"
- Can add persistence if user feedback indicates need

## Risks / Trade-offs

**[Risk] Recipe scaling hallucination** → Mitigation: System prompt instructs Claude on proper unit conversions and fractional display. Can add validation layer if issues arise in testing.

**[Risk] Timer widget visibility on mobile** → Mitigation: Widget positioned top-right with z-index. Test on various screen sizes during implementation.

**[Risk] Browser notification permissions denied** → Mitigation: Graceful degradation - widget still shows timer completion, just no OS notification. Consider adding permission request prompt on first timer use.

**[Risk] System prompt token cost accumulation** → Mitigation: Cooking guidance adds ~500 tokens. At $3/M input tokens, this is negligible ($0.0015 per 1000 messages). Can move to tool-based approach if this becomes material.

**[Risk] Single timer limitation frustrates users** → Mitigation: Monitor user feedback. If multi-timer requests emerge, implementation path is straightforward (array of timers + stacked widget UI).

**[Trade-off] Claude does scaling math vs backend calculation** → Accepted: Some variation possible in how Claude presents scaled quantities (e.g., "1½ tsp" vs "1.5 tsp"). This is acceptable for MVP - consistency matters less than natural conversation.

**[Trade-off] No cooking state persistence** → Accepted: If user refreshes mid-cooking, they lose timer and must remind AI where they were. Acceptable for MVP - real usage will inform if this is a problem.

## Migration Plan

**Deployment:**
1. Backend changes (system prompt, MCP tool, SSE event) - no database migrations needed
2. Frontend changes (JavaScript, unhide widget) - static assets
3. After deploying static assets, purge Cloudflare cache (as per CLAUDE.md)
4. No user migration required - new feature is opt-in via conversation

**Rollback:**
- Backend: Remove cooking prompt additions, disable start_timer tool
- Frontend: Re-hide timer widget, remove event handler
- No data cleanup needed (no database changes)

**Testing:**
- Unit tests for start_timer tool handler
- Manual testing with various recipes (scaling, multi-phase cooking)
- Mobile responsive testing (timer widget visibility)
- Browser notification testing across browsers

## Resolved Questions

- ~~Should timer widget allow manual dismissal before completion?~~ **YES** - Add cancel/dismiss button to timer widget for manual cancellation
- ~~What sound should play on timer completion?~~ **System default** - Use browser's native notification sound
- ~~Should we track which recipes users cook most often?~~ **NO** - Recipe usage tracking deferred, out of scope for MVP
