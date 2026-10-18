/**
 * Chat Module
 * Handles the note input and SSE streaming. It renders nothing itself: every
 * note, reply and error, and the turn's transient in-flight line, goes to
 * margin-notes.js.
 */

import * as MealPlanDisplay from './meal-plan-display.js';
import * as MarginNotes from './margin-notes.js';
import { clearPrefetchCache } from './page-transitions.js';

// Recipe ids already fetched during the current chat turn (reset in sendMessage)
let fetchedRecipeIds = new Set();

// Tools that add, rename (and so re-order) or remove a recipe. A turn that ran
// one refreshes the held recipe list once, at its done event; page turns use
// that list and never fetch it themselves.
const LIST_CHANGING_TOOLS = new Set(['create_recipe', 'update_recipe', 'delete_recipe']);

// Whether the current turn ran one of them (reset in sendMessage)
let listChanged = false;

/**
 * Refreshes the held recipe list after a turn that changed the book, and the
 * navigation state from it. With the contents on screen the contents redraw,
 * which makes the refresh itself (one list request either way).
 */
async function refreshListAfterTurn() {
    if (state.viewMode === 'index') {
        await state.renderContents();
    } else {
        await state.fetchRecipeList(true);
    }
    state.updateNavigationState();
}

/**
 * Handles a recipe_artifact id: clears the prefetch cache so the freshly
 * edited recipe is re-fetched rather than served stale, and fetches each id
 * at most once per turn so duplicate events do not turn the page twice.
 */
function handleRecipeArtifact(recipeId) {
    const key = String(recipeId);
    if (fetchedRecipeIds.has(key)) return;
    fetchedRecipeIds.add(key);
    clearPrefetchCache();
    state.fetchAndDisplayRecipe(recipeId);
}

// Import global state accessors (will be set by app.js)
export let state = null;

export function initializeState(appState) {
    state = appState;
}

// What the in-flight line says while a tool runs, in the cook's words. Tool
// names never reach the page.
const STATUS_LABELS = {
    start_timer: 'Setting a timer…',
    display_recipe: 'Opening the recipe…',
    update_recipe: 'Updating the recipe…',
    create_recipe: 'Writing it into the book…',
    list_recipes: 'Looking through the book…',
    get_recipe: 'Looking through the book…',
    display_meal_plan: 'Laying out the meal…',
};

/**
 * The in-flight line for a tool. Web tools are matched by substring: the fetch
 * server exposes `fetch`, and the search server (duckduckgo-mcp 2.2.0)
 * `duckduckgo_search`, `duckduckgo_news_search` and `jina_fetch`.
 * @param {string} tool - the tool name from a tool_use event
 * @returns {string}
 */
export function statusLabelFor(tool) {
    const name = tool == null ? '' : String(tool);
    if (Object.prototype.hasOwnProperty.call(STATUS_LABELS, name)) return STATUS_LABELS[name];
    if (name.includes('fetch') || name.includes('search')) return 'Looking it up…';
    return 'Working on it…';
}

// True from a send until its turn ends. The textarea is never disabled — the
// cook can write the next note while the reply streams, and focus stays put —
// so this flag is what makes Enter and send inert in the meantime.
let turnInFlight = false;

function setTurnInFlight(inFlight) {
    turnInFlight = inFlight;
    const send = document.getElementById('send-button');
    if (send) {
        if (inFlight) send.setAttribute('aria-disabled', 'true');
        else send.removeAttribute('aria-disabled');
    }
    if (!inFlight) MarginNotes.setInFlight(null);
}

/**
 * Parses Server-Sent Events (SSE) from a stream.
 * Properly handles multi-line events according to SSE specification.
 *
 * @param {ReadableStream} stream - The response body stream
 * @param {Function} onEvent - Callback for each parsed event: (eventType, data) => void
 * @param {Function} onError - Callback for errors: (error) => void
 */
async function parseSSEStream(stream, onEvent, onError) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let currentEvent = '';
    let currentData = [];

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            // Keep the last incomplete line in the buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
                // Blank line signals end of event
                if (line === '' || line === '\r') {
                    if (currentData.length > 0) {
                        // Join multi-line data with newlines
                        const dataStr = currentData.join('\n');
                        onEvent(currentEvent || 'message', dataStr);
                        currentEvent = '';
                        currentData = [];
                    }
                    continue;
                }

                // Parse event type
                if (line.startsWith('event:')) {
                    currentEvent = line.substring(6).trim();
                    continue;
                }

                // Parse data line
                if (line.startsWith('data:')) {
                    const data = line.substring(5);
                    // Remove leading space if present (per SSE spec)
                    currentData.push(data.startsWith(' ') ? data.substring(1) : data);
                    continue;
                }

                // Ignore comments (lines starting with ':')
                if (line.startsWith(':')) {
                    continue;
                }
            }
        }

        // Handle any remaining buffered event
        if (currentData.length > 0) {
            const dataStr = currentData.join('\n');
            onEvent(currentEvent || 'message', dataStr);
        }
    } catch (error) {
        onError(error);
    }
}

/**
 * Sends a chat message to the API and handles SSE streaming response.
 * Uses proper SSE parsing to handle multi-line events.
 */
export async function sendMessage() {
    // One turn at a time; the typed text stays in the textarea for later
    if (turnInFlight) return;

    const input = document.getElementById('message-input');
    const message = input.value.trim();

    // Require either message text or an attached image
    if (!message && !state.attachedImage) return;

    // The recipe this turn belongs to, captured once and before any await — the
    // same reason fetchAndDisplayRecipe records its id up front. Every entry the
    // turn produces (the user note, the streaming reply, errors) is
    // filed under the recipe that was on the page when the note was sent, so a
    // reply that lands after the reader has paged away stays with the recipe it
    // answers, and a recipe this turn creates does not claim the turn's notes.
    // null is the book-level thread: the contents page or a meal plan.
    const turnRecipeId = state.viewMode === 'recipe' && state.currentRecipeId != null
        ? String(state.currentRecipeId)
        : null;

    input.value = '';
    // Reset textarea height after clearing
    input.style.height = 'auto';
    MarginNotes.addNote(message, 'user', turnRecipeId);
    setTurnInFlight(true);
    MarginNotes.setInFlight('Thinking…');

    // Each turn fetches a given recipe id at most once
    fetchedRecipeIds = new Set();
    listChanged = false;

    // A previous turn that ended without a done event (dropped connection) would
    // otherwise leave its streaming note open and have this turn overwrite it
    MarginNotes.finalizeStreamingNote();

    let streamedText = '';

    try {
        const payload = {
            message: message || "",  // Ensure message is never undefined
            conversation_id: state.conversationId
        };

        if (state.viewMode === 'recipe' && state.currentRecipeId) {
            payload.current_recipe = {
                recipe_id: String(state.currentRecipeId)
            };
            if (state.currentRecipeTitle) {
                payload.current_recipe.title = state.currentRecipeTitle;
            }
        }

        // Include image if attached, then clear the indicator immediately
        if (state.attachedImage) {
            payload.image = {
                data: state.attachedImage.data,
                media_type: state.attachedImage.media_type
            };
            console.log('Sending message with image:', {
                textLength: message.length,
                imageSize: state.attachedImage.size,
                mediaType: state.attachedImage.media_type
            });
            state.removeImage();
        }

        console.log('Sending chat request...', payload.message ? 'with text' : 'image only');

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify(payload)
        });

        console.log('Response received:', response.status, response.statusText);

        if (response.status === 401) {
            setTurnInFlight(false);
            window.location.href = '/chat';
            return;
        }

        if (!response.ok) {
            // Handle non-200 responses
            const errorText = await response.text();
            console.error('Server error:', response.status, errorText);

            MarginNotes.finalizeStreamingNote();
            if (response.status === 413) {
                MarginNotes.addNote('Error: Image too large for server. Try a smaller image or compress it first.', 'error', turnRecipeId);
            } else {
                MarginNotes.addNote(`Error: ${response.statusText || 'Server error'}`, 'error', turnRecipeId);
            }
            setTurnInFlight(false);
            return;
        }

        // Parse SSE stream with proper event handling
        await parseSSEStream(
            response.body,
            (eventType, data) => {
                if (!data) return;

                try {
                    const parsed = JSON.parse(data);

                    // Handle different event types
                    switch (eventType) {
                        case 'chunk':
                            // Text streaming: the reply takes the in-flight line's place
                            if (parsed.text) {
                                streamedText += parsed.text;
                                MarginNotes.updateStreamingNote(streamedText, turnRecipeId);
                                MarginNotes.setInFlight(null);
                            }
                            break;

                        case 'tool_use':
                            // Tool call notification: a label on the in-flight line, nothing stored
                            if (parsed.tool) {
                                MarginNotes.setInFlight(statusLabelFor(parsed.tool));
                                if (LIST_CHANGING_TOOLS.has(parsed.tool)) listChanged = true;
                            }
                            break;

                        case 'recipe_artifact':
                            // Recipe panel display
                            if (parsed.recipe_id !== undefined) {
                                handleRecipeArtifact(parsed.recipe_id);
                            }
                            break;

                        case 'meal_artifact':
                            // Meal plan panel display
                            MealPlanDisplay.renderMealPlan(parsed);
                            break;

                        case 'timer_start':
                            // Timer start: the pill is the confirmation
                            if (parsed.duration_minutes !== undefined && parsed.label !== undefined) {
                                state.startTimer(parsed.duration_minutes, parsed.label, parsed.step_number);
                            }
                            break;

                        case 'done':
                            // Response completion
                            if (parsed.conversation_id) {
                                state.conversationId = parsed.conversation_id;
                            }
                            MarginNotes.finalizeStreamingNote();
                            MarginNotes.setInFlight(null);
                            if (listChanged) {
                                listChanged = false;
                                refreshListAfterTurn();
                            }
                            break;

                        case 'error':
                            // Error handling
                            if (parsed.message) {
                                MarginNotes.finalizeStreamingNote();
                                MarginNotes.setInFlight(null);
                                MarginNotes.addNote(parsed.message, 'error', turnRecipeId);
                            }
                            break;

                        default:
                            // Fallback: handle events without explicit type (backward compatibility)
                            if (parsed.text !== undefined) {
                                if (parsed.text) {
                                    streamedText += parsed.text;
                                    MarginNotes.updateStreamingNote(streamedText, turnRecipeId);
                                    MarginNotes.setInFlight(null);
                                }
                            } else if (parsed.recipe_id !== undefined) {
                                handleRecipeArtifact(parsed.recipe_id);
                            } else if (parsed.duration_minutes !== undefined && parsed.label !== undefined) {
                                state.startTimer(parsed.duration_minutes, parsed.label, parsed.step_number);
                            } else if (parsed.tool) {
                                MarginNotes.setInFlight(statusLabelFor(parsed.tool));
                            } else if (parsed.conversation_id) {
                                state.conversationId = parsed.conversation_id;
                                MarginNotes.finalizeStreamingNote();
                                MarginNotes.setInFlight(null);
                            } else if (parsed.message && parsed.recoverable !== undefined) {
                                MarginNotes.setInFlight(null);
                                MarginNotes.addNote(parsed.message, 'error', turnRecipeId);
                            }
                            break;
                    }
                } catch (e) {
                    console.log('Parse error:', e, data);
                }
            },
            (error) => {
                console.error('SSE stream error:', error);
                // The stream died without a done event: end the streaming note so the
                // next turn starts a new one instead of overwriting this partial reply
                MarginNotes.finalizeStreamingNote();
                MarginNotes.setInFlight(null);
                MarginNotes.addNote('Connection error. Please try again.', 'error', turnRecipeId);
            }
        );
    } catch (error) {
        console.error('Error:', error);
        MarginNotes.finalizeStreamingNote();
        MarginNotes.setInFlight(null);
        MarginNotes.addNote('Connection error. Please try again.', 'error', turnRecipeId);
    }

    setTurnInFlight(false);
}
