/**
 * Chat Module
 * Handles the note input and SSE streaming. It renders nothing itself: every
 * note, reply, status line and error goes to margin-notes.js.
 */

import * as MealPlanDisplay from './meal-plan-display.js';
import * as MarginNotes from './margin-notes.js';
import { clearPrefetchCache } from './page-transitions.js';

// Recipe ids already fetched during the current chat turn (reset in sendMessage)
let fetchedRecipeIds = new Set();

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

export function setLoading(loading, text = 'Thinking...') {
    const loadingEl = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    const input = document.getElementById('message-input');

    loadingEl.classList.toggle('active', loading);
    loadingText.textContent = text;
    input.disabled = loading;
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
    const input = document.getElementById('message-input');
    const message = input.value.trim();

    // Require either message text or an attached image
    if (!message && !state.attachedImage) return;

    // The recipe this turn belongs to, captured once and before any await — the
    // same reason fetchAndDisplayRecipe records its id up front. Every entry the
    // turn produces (the user note, status lines, the streaming reply, errors) is
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
    setLoading(true);

    // Each turn fetches a given recipe id at most once
    fetchedRecipeIds = new Set();

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
            setLoading(false);
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
                            // Text streaming
                            if (parsed.text) {
                                streamedText += parsed.text;
                                MarginNotes.updateStreamingNote(streamedText, turnRecipeId);
                            }
                            break;

                        case 'tool_use':
                            // Tool call notification
                            if (parsed.tool) {
                                setLoading(true, `Using ${parsed.tool}...`);
                                MarginNotes.addNote(`Using tool: ${parsed.tool}`, 'status', turnRecipeId);
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
                            // Timer start
                            if (parsed.duration_minutes !== undefined && parsed.label !== undefined) {
                                state.startTimer(parsed.duration_minutes, parsed.label, parsed.step_number);
                                MarginNotes.addNote(
                                    `Timer set: ${parsed.label}, ${parsed.duration_minutes} min`,
                                    'status',
                                    turnRecipeId
                                );
                            }
                            break;

                        case 'done':
                            // Response completion
                            if (parsed.conversation_id) {
                                state.conversationId = parsed.conversation_id;
                            }
                            MarginNotes.finalizeStreamingNote();
                            break;

                        case 'error':
                            // Error handling
                            if (parsed.message) {
                                MarginNotes.finalizeStreamingNote();
                                MarginNotes.addNote(parsed.message, 'error', turnRecipeId);
                            }
                            break;

                        default:
                            // Fallback: handle events without explicit type (backward compatibility)
                            if (parsed.text !== undefined) {
                                if (parsed.text) {
                                    streamedText += parsed.text;
                                    MarginNotes.updateStreamingNote(streamedText, turnRecipeId);
                                }
                            } else if (parsed.recipe_id !== undefined) {
                                handleRecipeArtifact(parsed.recipe_id);
                            } else if (parsed.duration_minutes !== undefined && parsed.label !== undefined) {
                                state.startTimer(parsed.duration_minutes, parsed.label, parsed.step_number);
                                MarginNotes.addNote(
                                    `Timer set: ${parsed.label}, ${parsed.duration_minutes} min`,
                                    'status',
                                    turnRecipeId
                                );
                            } else if (parsed.tool) {
                                setLoading(true, `Using ${parsed.tool}...`);
                                MarginNotes.addNote(`Using tool: ${parsed.tool}`, 'status', turnRecipeId);
                            } else if (parsed.conversation_id) {
                                state.conversationId = parsed.conversation_id;
                                MarginNotes.finalizeStreamingNote();
                            } else if (parsed.message && parsed.recoverable !== undefined) {
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
                MarginNotes.addNote('Connection error. Please try again.', 'error', turnRecipeId);
            }
        );
    } catch (error) {
        console.error('Error:', error);
        MarginNotes.finalizeStreamingNote();
        MarginNotes.addNote('Connection error. Please try again.', 'error', turnRecipeId);
    }

    setLoading(false);
}
