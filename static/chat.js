/**
 * Chat Module
 * Handles chat UI, SSE streaming, and message rendering
 */

import { escapeHtml } from './utils.js';

// Import global state accessors (will be set by app.js)
export let state = null;

export function initializeState(appState) {
    state = appState;
}

export function scrollToBottom() {
    const messages = document.getElementById('messages');
    messages.scrollTop = messages.scrollHeight;
}

/**
 * Renders markdown text to HTML.
 * Uses marked.js library if available, otherwise falls back to basic patterns.
 *
 * NOTE: This function returns HTML that will be inserted via innerHTML.
 * It is used for AI-generated content which is considered trusted (controlled by us).
 * User input should NOT be passed through this function - use escapeHtml() instead.
 */
export function renderMarkdown(text) {
    try {
        if (typeof marked !== 'undefined' && marked.parse) {
            return marked.parse(text);
        }
    } catch (e) {
        console.error('Markdown parsing error:', e);
    }
    // Fallback: basic markdown rendering
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        .replace(/\n/g, '<br>');
}

export function addMessage(content, role, isStreaming = false) {
    const messages = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = `message ${role}` + (isStreaming ? ' streaming' : '');

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Format with speaker label
    const speaker = role === 'user' ? 'User' : (role === 'assistant' ? 'AI' : '');
    const prefix = speaker ? `<strong>${speaker}:</strong> ` : '';

    if (role === 'assistant') {
        // CONTROLLED: AI-generated content, rendered as markdown (trusted source)
        contentDiv.innerHTML = prefix + renderMarkdown(content);
    } else if (role === 'tool-use') {
        // SANITIZED: Tool names could theoretically contain user input
        contentDiv.innerHTML = `<em>${escapeHtml(content)}</em>`;
    } else if (role === 'error') {
        // SANITIZED: Error messages may contain user input or data
        contentDiv.innerHTML = `<strong>Error:</strong> ${escapeHtml(content)}`;
    } else {
        // SANITIZED: User messages are user input and must be escaped
        contentDiv.innerHTML = prefix + escapeHtml(content);
    }

    div.appendChild(contentDiv);

    if (isStreaming) {
        div.id = 'streaming-message';
    }
    messages.appendChild(div);
    scrollToBottom();
    return div;
}

export function updateStreamingMessage(content) {
    let msg = document.getElementById('streaming-message');
    if (msg) {
        const contentDiv = msg.querySelector('.message-content');
        // CONTROLLED: AI-generated streaming content (trusted source)
        contentDiv.innerHTML = '<strong>AI:</strong> ' + renderMarkdown(content);
    } else {
        msg = addMessage(content, 'assistant', true);
    }
    scrollToBottom();
}

export function finalizeStreamingMessage() {
    const msg = document.getElementById('streaming-message');
    if (msg) {
        msg.classList.remove('streaming');
        msg.removeAttribute('id');
    }
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

    input.value = '';
    // Reset textarea height after clearing
    input.style.height = 'auto';
    addMessage(message, 'user');
    setLoading(true);

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

        // Include image if attached
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

            if (response.status === 413) {
                addMessage('Error: Image too large for server. Try a smaller image or compress it first.', 'error');
            } else {
                addMessage(`Error: ${response.statusText || 'Server error'}`, 'error');
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
                                updateStreamingMessage(streamedText);
                            }
                            break;

                        case 'tool_use':
                            // Tool call notification
                            if (parsed.tool) {
                                setLoading(true, `Using ${parsed.tool}...`);
                                addMessage(`Using tool: ${parsed.tool}`, 'tool-use');
                            }
                            break;

                        case 'recipe_artifact':
                            // Recipe panel display
                            if (parsed.recipe_id !== undefined) {
                                state.fetchAndDisplayRecipe(parsed.recipe_id);
                            }
                            break;

                        case 'timer_start':
                            // Timer start
                            if (parsed.duration_minutes !== undefined && parsed.label !== undefined) {
                                state.startTimer(parsed.duration_minutes, parsed.label);
                            }
                            break;

                        case 'done':
                            // Response completion
                            if (parsed.conversation_id) {
                                state.conversationId = parsed.conversation_id;
                            }
                            finalizeStreamingMessage();
                            break;

                        case 'error':
                            // Error handling
                            if (parsed.message) {
                                addMessage(parsed.message, 'error');
                            }
                            break;

                        default:
                            // Fallback: handle events without explicit type (backward compatibility)
                            if (parsed.text !== undefined) {
                                if (parsed.text) {
                                    streamedText += parsed.text;
                                    updateStreamingMessage(streamedText);
                                }
                            } else if (parsed.recipe_id !== undefined) {
                                state.fetchAndDisplayRecipe(parsed.recipe_id);
                            } else if (parsed.duration_minutes !== undefined && parsed.label !== undefined) {
                                state.startTimer(parsed.duration_minutes, parsed.label);
                            } else if (parsed.tool) {
                                setLoading(true, `Using ${parsed.tool}...`);
                                addMessage(`Using tool: ${parsed.tool}`, 'tool-use');
                            } else if (parsed.conversation_id) {
                                state.conversationId = parsed.conversation_id;
                                finalizeStreamingMessage();
                            } else if (parsed.message && parsed.recoverable !== undefined) {
                                addMessage(parsed.message, 'error');
                            }
                            break;
                    }
                } catch (e) {
                    console.log('Parse error:', e, data);
                }
            },
            (error) => {
                console.error('SSE stream error:', error);
                addMessage('Connection error. Please try again.', 'error');
            }
        );
    } catch (error) {
        console.error('Error:', error);
        addMessage('Connection error. Please try again.', 'error');
    }

    // Clear attached image after successful send
    if (state.attachedImage) {
        state.removeImage();
    }

    setLoading(false);
}
