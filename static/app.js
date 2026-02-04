let conversationId = null;

function scrollToBottom() {
    const messages = document.getElementById('messages');
    messages.scrollTop = messages.scrollHeight;
}

function renderMarkdown(text) {
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

function addMessage(content, role, isStreaming = false) {
    const messages = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = `message ${role}` + (isStreaming ? ' streaming' : '');

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Format with speaker label
    const speaker = role === 'user' ? 'User' : (role === 'assistant' ? 'AI' : '');
    const prefix = speaker ? `<strong>${speaker}:</strong> ` : '';

    if (role === 'assistant') {
        contentDiv.innerHTML = prefix + renderMarkdown(content);
    } else if (role === 'tool-use') {
        contentDiv.innerHTML = `<em>${content}</em>`;
    } else if (role === 'error') {
        contentDiv.innerHTML = `<strong>Error:</strong> ${content}`;
    } else {
        contentDiv.innerHTML = prefix + content;
    }

    div.appendChild(contentDiv);

    if (isStreaming) {
        div.id = 'streaming-message';
    }
    messages.appendChild(div);
    scrollToBottom();
    return div;
}

function updateStreamingMessage(content) {
    let msg = document.getElementById('streaming-message');
    if (msg) {
        const contentDiv = msg.querySelector('.message-content');
        contentDiv.innerHTML = '<strong>AI:</strong> ' + renderMarkdown(content);
    } else {
        msg = addMessage(content, 'assistant', true);
    }
    scrollToBottom();
}

function finalizeStreamingMessage() {
    const msg = document.getElementById('streaming-message');
    if (msg) {
        msg.classList.remove('streaming');
        msg.removeAttribute('id');
    }
}

function setLoading(loading, text = 'Thinking...') {
    const loadingEl = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    const input = document.getElementById('message-input');

    loadingEl.classList.toggle('active', loading);
    loadingText.textContent = text;
    input.disabled = loading;
}

// Recipe Display Functions
function showRecipeLoading() {
    const leftPage = document.getElementById('page-left');
    const rightPage = document.getElementById('page-right');

    leftPage.innerHTML = `
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-short"></div>
    `;

    rightPage.innerHTML = `
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
    `;
}

function showRecipeError(message) {
    const leftPage = document.getElementById('page-left');
    leftPage.innerHTML = `
        <div class="recipe-placeholder">
            <div class="recipe-placeholder-text" style="color: var(--color-leather);">
                ${message}
            </div>
        </div>
    `;
}

async function fetchAndDisplayRecipe(recipeId) {
    showRecipeLoading();
    try {
        const response = await fetch(`/api/recipes/${recipeId}`, {
            credentials: 'same-origin'
        });
        if (!response.ok) {
            if (response.status === 404) {
                showRecipeError('Recipe not found');
            } else {
                showRecipeError('Failed to load recipe');
            }
            return;
        }
        const recipe = await response.json();
        renderRecipe(recipe);
    } catch (error) {
        console.error('Error fetching recipe:', error);
        showRecipeError('Failed to load recipe');
    }
}

function renderRecipe(recipe) {
    const leftPage = document.getElementById('page-left');
    const rightPage = document.getElementById('page-right');

    // Build ingredients list
    const ingredientsList = (recipe.ingredients || []).map(ing => {
        const qty = ing.quantity ? `${ing.quantity} ` : '';
        const unit = ing.unit ? `${ing.unit} ` : '';
        const notes = ing.notes ? ` <span class="step-note">(${ing.notes})</span>` : '';
        return `<div class="ingredient-line">${qty}${unit}${ing.name}${notes}</div>`;
    }).join('');

    // Build difficulty dots
    const difficulty = recipe.difficulty || 1;
    const difficultyDots = Array(5).fill(0).map((_, i) =>
        `<span class="difficulty-dot${i < difficulty ? ' filled' : ''}"></span>`
    ).join('');

    // Left page - Ingredients & Metadata
    leftPage.innerHTML = `
        <div class="recipe-label">recipe</div>
        <div class="recipe-title">${recipe.title || 'Untitled Recipe'}</div>

        <div class="section-header">ingredients:</div>
        <div class="ingredients-list">
            ${ingredientsList || '<div class="ingredient-line">No ingredients listed</div>'}
            ${recipe.servings ? `<div class="serving-note">--> serves ${recipe.servings}</div>` : ''}
        </div>

        <div class="recipe-meta">
            <div class="meta-item">
                <span class="meta-label">Difficulty</span>
                <div class="difficulty-dots">${difficultyDots}</div>
                <span class="meta-value">${difficulty}/5</span>
            </div>
            ${recipe.servings ? `
            <div class="meta-item">
                <span class="meta-label">Serves</span>
                <div class="meta-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M3 11h18v2H3z"/>
                        <path d="M5 11V8a7 7 0 0114 0v3"/>
                        <path d="M7 13v4a2 2 0 002 2h6a2 2 0 002-2v-4"/>
                    </svg>
                </div>
                <span class="meta-value">${recipe.servings}</span>
            </div>
            ` : ''}
            ${recipe.prep_time ? `
            <div class="meta-item">
                <span class="meta-label">Prep time</span>
                <div class="meta-icon">
                    <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                </div>
                <span class="meta-value">${recipe.prep_time} min</span>
            </div>
            ` : ''}
            ${recipe.cook_time ? `
            <div class="meta-item">
                <span class="meta-label">Cook time</span>
                <div class="meta-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 2a4 4 0 00-4 4v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2h-2V6a4 4 0 00-4-4z"/>
                        <path d="M10 14h4"/>
                        <path d="M12 12v4"/>
                    </svg>
                </div>
                <span class="meta-value">${recipe.cook_time} min</span>
            </div>
            ` : ''}
        </div>
    `;

    // Build preparation steps
    const stepsList = (recipe.steps || []).map((step, i) => {
        const duration = step.duration_minutes
            ? `<span class="step-duration">${step.duration_minutes} min</span>`
            : '';
        return `<div class="prep-step">${i + 1}. ${step.instruction}${duration}</div>`;
    }).join('');

    // Right page - Preparation
    rightPage.innerHTML = `
        <div class="section-header">preparation</div>

        <div class="prep-list">
            ${stepsList || '<div class="prep-step">No preparation steps listed</div>'}
        </div>

        ${recipe.notes ? `<div class="recipe-note">Note: ${recipe.notes}</div>` : ''}
        ${recipe.description ? `<div class="recipe-note">${recipe.description}</div>` : ''}
    `;
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();

    if (!message) return;

    input.value = '';
    addMessage(message, 'user');
    setLoading(true);

    let streamedText = '';

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                message: message,
                conversation_id: conversationId
            })
        });

        if (response.status === 401) {
            window.location.href = '/chat';
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('event:')) {
                    continue;
                }

                if (line.startsWith('data:')) {
                    const data = line.substring(5).trim();
                    if (!data) continue;

                    try {
                        const parsed = JSON.parse(data);

                        if (parsed.text !== undefined) {
                            if (parsed.text) {
                                streamedText += parsed.text;
                                updateStreamingMessage(streamedText);
                            }
                        } else if (parsed.recipe_id !== undefined) {
                            fetchAndDisplayRecipe(parsed.recipe_id);
                        } else if (parsed.tool) {
                            setLoading(true, `Using ${parsed.tool}...`);
                            addMessage(`Using tool: ${parsed.tool}`, 'tool-use');
                        } else if (parsed.conversation_id) {
                            conversationId = parsed.conversation_id;
                            finalizeStreamingMessage();
                        } else if (parsed.message && parsed.recoverable !== undefined) {
                            addMessage(parsed.message, 'error');
                        }
                    } catch (e) {
                        console.log('Parse error:', e, data);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error:', error);
        addMessage('Connection error. Please try again.', 'error');
    }

    setLoading(false);
}
