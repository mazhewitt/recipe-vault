## 1. Backend - System Prompt

- [x] 1.1 Add cooking guidance instructions to system prompt in src/handlers/chat.rs (lines 96-150)
- [x] 1.2 Include recipe scaling guidance (unit conversions, fractional display)
- [x] 1.3 Include phase-based guidance instructions (not micro-steps)
- [x] 1.4 Include timer offering behavior

## 2. Backend - MCP Timer Tool

- [x] 2.1 Add start_timer tool definition to src/mcp/tools.rs (tool list)
- [x] 2.2 Implement start_timer handler in src/mcp/tools.rs (parameters: duration_minutes, label)
- [x] 2.3 Return timer_id and confirmation message from handler

## 3. Backend - SSE Timer Event

- [x] 3.1 Add TimerStart variant to SseEvent enum in src/handlers/chat.rs (lines 215-229)
- [x] 3.2 Detect start_timer tool calls in chat handler
- [x] 3.3 Emit timer_start SSE event with duration_minutes and label

## 4. Frontend - Timer Widget

- [x] 4.1 Add timer state variable to static/app.js (activeTimer)
- [x] 4.2 Implement startTimer(durationMinutes, label) function
- [x] 4.3 Implement onTimerComplete(label) function
- [x] 4.4 Add countdown display logic (MM:SS format)
- [x] 4.5 Unhide timer widget on timer start (show #timer-widget)
- [x] 4.6 Add cancel/dismiss button to timer widget in static/chat.html
- [x] 4.7 Implement cancelTimer() function to clear interval and hide widget

## 5. Frontend - Notifications

- [x] 5.1 Request notification permission on page load in app.js DOMContentLoaded
- [x] 5.2 Add browser notification on timer completion
- [x] 5.3 Handle notification permission denial gracefully

## 6. Frontend - SSE Integration

- [x] 6.1 Add timer_start event handler in sendMessage() SSE processing (around line 954)
- [x] 6.2 Call startTimer() when timer_start event received
- [x] 6.3 Parse duration_minutes and label from event data

## 7. Testing

- [x] 7.1 Test start_timer MCP tool with manual JSON-RPC call
- [x] 7.2 Test cooking guidance conversation flow (initiation, scaling, phases)
- [x] 7.3 Test timer SSE event emission and frontend countdown
- [x] 7.4 Test browser notifications on timer completion
- [x] 7.5 Test timer widget visibility on mobile (responsive design)
- [x] 7.6 Test recipe scaling with various serving sizes (verify math)
- [x] 7.7 Test single timer replacement (start new timer while one running)
- [x] 7.8 Test timer manual cancellation via cancel button
