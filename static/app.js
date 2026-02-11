let conversationId = null;
let currentRecipeId = null;
let currentRecipeTitle = null;
let recipeListCache = null;
let viewMode = 'index'; // 'index' | 'recipe'
let attachedImage = null; // Stores pasted image data
let activeTimer = null; // Stores active timer {interval, label}

// Image size limit (5MB)
// This matches Claude API's ~5MB limit for vision inputs. Images larger than this
// are rejected before upload to provide immediate feedback and avoid wasting bandwidth.
// The backend has a higher limit (10MB) to accommodate JSON payload overhead.
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

async function fetchRecipeList(forceRefresh = false) {
    if (recipeListCache && !forceRefresh) return recipeListCache;
    try {
        const resp = await fetch('/api/recipes', { credentials: 'same-origin' });
        if (!resp.ok) return [];
        const list = await resp.json();
        recipeListCache = list;
        return list;
    } catch (e) {
        console.error('Failed to fetch recipe list:', e);
        return [];
    }
}

function findIndexById(list, id) {
    return list.findIndex(r => String(r.id) === String(id));
}

async function updateNavigationState() {
    const prevBtn = document.getElementById('page-prev');
    const nextBtn = document.getElementById('page-next');
    const prevEdge = document.getElementById('mobile-edge-prev');
    const nextEdge = document.getElementById('mobile-edge-next');

    const list = await fetchRecipeList();
    if (!prevBtn || !nextBtn) return;

    let prevDisabled, nextDisabled;

    if (viewMode === 'index') {
        // On index: back arrow disabled, forward arrow enabled if recipes exist
        prevDisabled = true;
        nextDisabled = list.length === 0;
    } else if (!currentRecipeId) {
        // Fallback: no recipe displayed and not in index mode
        prevDisabled = list.length === 0;
        nextDisabled = list.length === 0;
    } else {
        const idx = findIndexById(list, currentRecipeId);

        if (idx === -1) {
            prevDisabled = list.length === 0;
            nextDisabled = list.length <= 1;
        } else {
            // In recipe view: back arrow always enabled (goes to previous recipe or index)
            // Forward arrow disabled at end of list
            prevDisabled = false;
            nextDisabled = idx >= list.length - 1;
        }
    }

    // Update desktop buttons
    prevBtn.disabled = prevDisabled;
    nextBtn.disabled = nextDisabled;

    // Update mobile edge navigation
    if (prevEdge && nextEdge) {
        prevEdge.classList.toggle('disabled', prevDisabled);
        nextEdge.classList.toggle('disabled', nextDisabled);
    }
}

async function loadNextRecipe() {
    // Fetch fresh list to ensure we're using up-to-date data after chat operations
    const list = await fetchRecipeList(true);
    if (list.length === 0) return;

    // If in index view, load first recipe
    if (viewMode === 'index') {
        fetchAndDisplayRecipe(list[0].id);
        return;
    }

    if (!currentRecipeId) {
        fetchAndDisplayRecipe(list[0].id);
        return;
    }
    const idx = findIndexById(list, currentRecipeId);
    if (idx === -1) {
        fetchAndDisplayRecipe(list[0].id);
        return;
    }
    if (idx < list.length - 1) {
        fetchAndDisplayRecipe(list[idx + 1].id);
    }
}

async function loadPrevRecipe() {
    // Fetch fresh list to ensure we're using up-to-date data after chat operations
    const list = await fetchRecipeList(true);
    if (list.length === 0) return;

    // If in index view, do nothing (back arrow should be disabled)
    if (viewMode === 'index') return;

    // If no recipe currently shown, clicking back should load the first recipe
    if (!currentRecipeId) {
        fetchAndDisplayRecipe(list[0].id);
        return;
    }

    const idx = findIndexById(list, currentRecipeId);
    if (idx === -1) {
        // Current recipe not found, return to index
        showIndex();
        return;
    }
    if (idx > 0) {
        fetchAndDisplayRecipe(list[idx - 1].id);
    } else {
        // At first recipe, return to index
        showIndex();
    }
}

// Image handling functions
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function showImageAttached(size) {
    const sizeMB = (size / (1024 * 1024)).toFixed(1);
    const indicator = document.getElementById('image-attachment');
    if (indicator) {
        indicator.querySelector('.image-text').textContent = `Image attached (${sizeMB}MB)`;
        indicator.style.display = 'flex';
    }
}

function removeImage() {
    attachedImage = null;
    const indicator = document.getElementById('image-attachment');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'paste-error';
    errorDiv.textContent = message;

    const notepadInput = document.querySelector('.notepad-input');
    if (notepadInput) {
        notepadInput.insertBefore(errorDiv, notepadInput.firstChild);
        setTimeout(() => errorDiv.remove(), 3000);
    }
}

async function handleImageFile(imageFile) {
    // Validate size
    if (imageFile.size > MAX_IMAGE_SIZE) {
        const sizeMB = (imageFile.size / (1024 * 1024)).toFixed(1);
        showError(`Image too large (${sizeMB}MB). Max size is 5MB.`);
        return;
    }

    try {
        const base64 = await fileToBase64(imageFile);

        // Strip data URL prefix
        const base64Data = base64.split(',')[1];

        attachedImage = {
            data: base64Data,
            media_type: imageFile.type,
            size: imageFile.size
        };

        showImageAttached(imageFile.size);
    } catch (error) {
        console.error('Error processing image:', error);
        showError('Failed to process image. Please try again.');
    }
}

async function setupImagePasteHandler() {
    const messageInput = document.getElementById('message-input');
    if (!messageInput) return;

    messageInput.addEventListener('paste', async (e) => {
        const items = e.clipboardData.items;

        // Find and extract image file from clipboard items
        // On Android, images may be reported with different MIME types or as file objects
        let imageFile = null;
        for (let item of items) {
            // Check if this is an image type
            if (item.type.startsWith('image/')) {
                imageFile = item.getAsFile();
                break;
            }

            // On Android, sometimes images are reported as text/plain or other types
            // but getAsFile() still returns the image file
            const file = item.getAsFile();
            if (file && file.type && file.type.startsWith('image/')) {
                imageFile = file;
                break;
            }
        }

        // Prevent default paste if we found an image to avoid pasting gibberish
        if (imageFile) {
            e.preventDefault();
            await handleImageFile(imageFile);
        }
    });
}

async function setupClipboardButton() {
    const clipboardButton = document.getElementById('clipboard-button');
    const imageUpload = document.getElementById('image-upload');
    if (!clipboardButton || !imageUpload) return;

    clipboardButton.addEventListener('click', () => {
        imageUpload.click();
    });
}

function setupImageUploadHandler() {
    const imageUpload = document.getElementById('image-upload');
    if (!imageUpload) return;

    imageUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await handleImageFile(file);
            // Clear input so the same file can be chosen again if removed
            imageUpload.value = '';
        }
    });
}

function setupTextareaAutoResize() {
    const textarea = document.getElementById('message-input');
    if (!textarea) return;

    const autoResize = () => {
        // Reset height to recalculate
        textarea.style.height = 'auto';

        // Set height to scrollHeight (content height) up to max-height
        const newHeight = Math.min(textarea.scrollHeight, 200);
        textarea.style.height = newHeight + 'px';
    };

    // Auto-resize on input
    textarea.addEventListener('input', autoResize);

    // Initial resize in case there's pre-filled content
    autoResize();
}

// Timer functions
function startTimer(durationMinutes, label) {
    // Clear any existing timer
    if (activeTimer) {
        clearInterval(activeTimer.interval);
    }

    const widget = document.getElementById('timer-widget');
    const timerText = document.getElementById('timer-text');

    let secondsLeft = Math.round(durationMinutes * 60);

    // Update display
    const updateDisplay = () => {
        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;
        timerText.textContent = `${label}: ${mins}:${secs.toString().padStart(2, '0')}`;
    };

    updateDisplay();
    widget.style.display = 'flex';

    // Count down every second
    const interval = setInterval(() => {
        secondsLeft--;

        if (secondsLeft <= 0) {
            clearInterval(interval);
            onTimerComplete(label);
        } else {
            updateDisplay();
        }
    }, 1000);

    activeTimer = { interval, label };
}

function onTimerComplete(label) {
    const timerText = document.getElementById('timer-text');
    timerText.textContent = `${label} - Done! ✓`;

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Recipe Vault Timer', {
            body: `${label} - Time's up!`,
            icon: '/favicon.ico',
            tag: 'recipe-timer'
        });
    }

    activeTimer = null;

    // Auto-hide after 3 seconds
    setTimeout(() => {
        const widget = document.getElementById('timer-widget');
        widget.style.display = 'none';
    }, 3000);
}

// eslint-disable-next-line no-unused-vars -- Called from HTML onclick attribute
function cancelTimer() {
    if (activeTimer) {
        clearInterval(activeTimer.interval);
        activeTimer = null;
    }
    const widget = document.getElementById('timer-widget');
    widget.style.display = 'none';
}

// attach handlers once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const prevBtn = document.getElementById('page-prev');
    const nextBtn = document.getElementById('page-next');
    if (prevBtn) prevBtn.addEventListener('click', () => { loadPrevRecipe().then(updateNavigationState); });
    if (nextBtn) nextBtn.addEventListener('click', () => { loadNextRecipe().then(updateNavigationState); });

    // Initial state for mobile
    if (window.innerWidth <= 600) {
        switchTab('book');
    }
    setupMobileKeyboardHandling();
    setupResponsiveListeners();
    setupMobileEdgeNavigation();
    setupMobileSwipeDetection();

    // Show index on page load
    showIndex();

    // Setup image paste handler
    setupImagePasteHandler();
    setupImageUploadHandler();
    setupClipboardButton();
    setupTextareaAutoResize();

    // Request notification permission for timers
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('Notification permission granted');
            }
        });
    }
});

function setupResponsiveListeners() {
    const mobileQuery = window.matchMedia('(max-width: 600px)');

    const handleLayoutChange = (e) => {
        // Re-render current view when crossing 600px boundary
        if (viewMode === 'index') {
            showIndex();
        } else if (currentRecipeId) {
            fetchAndDisplayRecipe(currentRecipeId);
        }

        if (e.matches) {
            switchTab('book');
        } else {
            const container = document.querySelector('.app-container');
            if (container) container.removeAttribute('data-active-tab');
        }
    };

    if (mobileQuery.addEventListener) {
        mobileQuery.addEventListener('change', handleLayoutChange);
    } else {
        mobileQuery.addListener(handleLayoutChange);
    }
}

function switchTab(tab) {
    const container = document.querySelector('.app-container');
    if (!container) return;

    container.setAttribute('data-active-tab', tab);

    // Update active state of buttons
    document.querySelectorAll('.mobile-tab').forEach(btn => {
        btn.classList.toggle('active', btn.id === `tab-${tab}`);
    });
}

function isMobile() {
    return window.matchMedia('(max-width: 600px)').matches;
}

function setupMobileKeyboardHandling() {
    const input = document.getElementById('message-input');
    const tabBar = document.querySelector('.mobile-tab-bar');
    if (!input || !tabBar) return;

    input.addEventListener('focus', () => {
        if (window.innerWidth <= 600) {
            tabBar.style.display = 'none';
        }
    });

    input.addEventListener('blur', () => {
        if (window.innerWidth <= 600) {
            tabBar.style.display = 'flex';
        }
    });
}

function setupMobileEdgeNavigation() {
    const prevEdge = document.getElementById('mobile-edge-prev');
    const nextEdge = document.getElementById('mobile-edge-next');

    if (!prevEdge || !nextEdge) return;

    prevEdge.addEventListener('click', () => {
        if (!isMobile()) return;
        const container = document.querySelector('.app-container');
        if (container && container.getAttribute('data-active-tab') === 'book') {
            loadPrevRecipe().then(updateNavigationState);
        }
    });

    nextEdge.addEventListener('click', () => {
        if (!isMobile()) return;
        const container = document.querySelector('.app-container');
        if (container && container.getAttribute('data-active-tab') === 'book') {
            loadNextRecipe().then(updateNavigationState);
        }
    });
}

function setupMobileSwipeDetection() {
    const bookContainer = document.querySelector('.book-container');
    if (!bookContainer) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    bookContainer.addEventListener('touchstart', (e) => {
        if (!isMobile()) return;
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    bookContainer.addEventListener('touchend', (e) => {
        if (!isMobile()) return;

        const container = document.querySelector('.app-container');
        if (!container || container.getAttribute('data-active-tab') !== 'book') return;

        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // Only trigger if horizontal swipe is dominant and exceeds threshold
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            if (deltaX > 0) {
                // Swipe right = go back
                loadPrevRecipe().then(updateNavigationState);
            } else {
                // Swipe left = go forward
                loadNextRecipe().then(updateNavigationState);
            }
        }
    }, { passive: true });
}

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

async function showIndex() {
    viewMode = 'index';
    currentRecipeId = null;
    currentRecipeTitle = null;
    const list = await fetchRecipeList(true);
    renderIndex(list);
    updateNavigationState();
}

function renderIndex(recipes) {
    const leftContent = document.getElementById('page-left-content');
    const rightContent = document.getElementById('page-right-content');

    if (recipes.length === 0) {
        leftContent.innerHTML = `
            <div class="recipe-placeholder">
                <div class="recipe-placeholder-text">
                    Your recipe book is empty. Ask me to create a recipe!
                </div>
            </div>
        `;
        rightContent.innerHTML = '';
        return;
    }

    // Group by first letter
    const groups = {};
    recipes.forEach(recipe => {
        const letter = recipe.title[0].toUpperCase();
        if (!groups[letter]) groups[letter] = [];
        groups[letter].push(recipe);
    });

    const sortedLetters = Object.keys(groups).sort();

    function renderGroup(letters) {
        return letters.map(letter => {
            const recipeItems = groups[letter].map(recipe =>
                `<div class="index-recipe-item" data-recipe-id="${recipe.id}">${recipe.title}</div>`
            ).join('');
            return `
                <div class="index-letter-group">
                    <div class="index-letter-header">${letter}</div>
                    ${recipeItems}
                </div>
            `;
        }).join('');
    }

    if (isMobile()) {
        leftContent.innerHTML = `
            <div class="index-title">~ Index ~</div>
            ${renderGroup(sortedLetters)}
        `;
        rightContent.innerHTML = '';
    } else {
        // Split groups across pages based on recipe count
        const totalRecipes = recipes.length;
        const targetPerSide = totalRecipes / 2;
        
        let currentCount = 0;
        let splitIndex = 0;

        // Find the letter index where we should split
        for (let i = 0; i < sortedLetters.length; i++) {
            const letter = sortedLetters[i];
            const countInGroup = groups[letter].length;
            
            // If adding this group keeps us under/near the target, include it in left page
            // Or if it's the first group and huge, we have to include it
            if (currentCount + countInGroup <= targetPerSide || i === 0) {
                currentCount += countInGroup;
                splitIndex = i + 1;
            } else {
                // If this group pushes us way over, stop here (it goes to right page)
                // Unless the left page is empty, then we must put at least one group there
                if (currentCount === 0) {
                    splitIndex = 1;
                }
                break;
            }
        }

        const leftLetters = sortedLetters.slice(0, splitIndex);
        const rightLetters = sortedLetters.slice(splitIndex);

        leftContent.innerHTML = `
            <div class="index-title">~ Index ~</div>
            ${renderGroup(leftLetters)}
        `;

        rightContent.innerHTML = renderGroup(rightLetters);
    }

    // Add click handlers for recipe names
    document.querySelectorAll('.index-recipe-item').forEach(item => {
        item.addEventListener('click', () => {
            const recipeId = item.getAttribute('data-recipe-id');
            fetchAndDisplayRecipe(recipeId);
        });
    });
}

// Recipe Display Functions
function showRecipeLoading() {
    const leftContent = document.getElementById('page-left-content');
    const rightContent = document.getElementById('page-right-content');

    leftContent.innerHTML = `
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-short"></div>
    `;

    if (!isMobile()) {
        rightContent.innerHTML = `
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-line"></div>
            <div class="skeleton skeleton-line"></div>
            <div class="skeleton skeleton-line"></div>
            <div class="skeleton skeleton-line"></div>
        `;
    } else {
        rightContent.innerHTML = '';
    }
}

function showRecipeError(message) {
    const leftContent = document.getElementById('page-left-content');
    leftContent.innerHTML = `
        <div class="recipe-placeholder">
            <div class="recipe-placeholder-text" style="color: var(--color-leather);">
                ${message}
            </div>
        </div>
    `;
}

async function fetchAndDisplayRecipe(recipeId) {
    showRecipeLoading();
    viewMode = 'recipe';
    try {
        const response = await fetch(`/api/recipes/${recipeId}`, {
            credentials: 'same-origin'
        });
        if (!response.ok) {
            if (response.status === 404) {
                // Recipe missing - refresh list and fallback to first if available
                const list = await fetchRecipeList(true);
                if (list.length > 0) {
                    const firstId = list[0].id;
                    currentRecipeId = firstId;
                    currentRecipeTitle = list[0].title || null;
                    await fetchAndDisplayRecipe(firstId);
                } else {
                    currentRecipeId = null;
                    currentRecipeTitle = null;
                    showRecipeError('Recipe not found');
                    updateNavigationState();
                }
            } else {
                showRecipeError('Failed to load recipe');
            }
            return;
        }
        const recipe = await response.json();
        renderRecipe(recipe);
        currentRecipeId = recipe.id || recipe.recipe?.id || currentRecipeId;
        currentRecipeTitle = recipe.title || recipe.recipe?.title || currentRecipeTitle;
        // Refresh recipe list to include newly created recipes
        await fetchRecipeList(true);
        updateNavigationState();
    } catch (error) {
        console.error('Error fetching recipe:', error);
        showRecipeError('Failed to load recipe');
        updateNavigationState();
    }
}

function getTotalTimeMinutes(recipe) {
    const prepTime = Number(recipe.prep_time);
    const cookTime = Number(recipe.cook_time);
    const hasPrep = Number.isFinite(prepTime) && prepTime > 0;
    const hasCook = Number.isFinite(cookTime) && cookTime > 0;

    if (hasPrep || hasCook) {
        return (hasPrep ? prepTime : 0) + (hasCook ? cookTime : 0);
    }

    const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
    const stepTotal = steps.reduce((sum, step) => {
        const duration = Number(step.duration_minutes);
        if (!Number.isFinite(duration) || duration <= 0) {
            return sum;
        }
        return sum + duration;
    }, 0);

    return stepTotal > 0 ? stepTotal : null;
}

function renderRecipe(recipe) {
    const leftContent = document.getElementById('page-left-content');
    const rightContent = document.getElementById('page-right-content');

    // Build ingredients list
    const ingredientsList = (recipe.ingredients || []).map(ing => {
        const qty = ing.quantity ? `${ing.quantity} ` : '';
        const unit = ing.unit ? `${ing.unit} ` : '';
        const notes = ing.notes ? ` <span class="step-note">(${ing.notes})</span>` : '';
        return `<div class="ingredient-line">${qty}${unit}${ing.name}${notes}</div>`;
    }).join('');

    // Build difficulty dots
    const difficulty = recipe.difficulty;
    const difficultyDots = difficulty
        ? Array(5).fill(0).map((_, i) =>
            `<span class="difficulty-dot${i < difficulty ? ' filled' : ''}"></span>`
          ).join('')
        : Array(5).fill(0).map(() =>
            `<span class="difficulty-dot"></span>`
          ).join('');

    // Build preparation steps
    const stepsList = (recipe.steps || []).map((step, i) => {
        const duration = step.duration_minutes
            ? `<span class="step-duration">${step.duration_minutes} min</span>`
            : '';
        return `<div class="prep-step">${i + 1}. ${step.instruction}${duration}</div>`;
    }).join('');

    // Format email for display (show name portion before @)
    const formatEmail = (email) => {
        if (!email) return null;
        const name = email.split('@')[0];
        return name.replace(/[._-]/g, ' ');
    };

    // Build authorship info
    const authorshipHtml = [];
    if (recipe.created_by) {
        authorshipHtml.push(`<div class="recipe-meta-item">Created by ${formatEmail(recipe.created_by)}</div>`);
    }
    if (recipe.updated_by && recipe.updated_by !== recipe.created_by) {
        authorshipHtml.push(`<div class="recipe-meta-item">Updated by ${formatEmail(recipe.updated_by)}</div>`);
    }
    const authorship = authorshipHtml.length > 0
        ? `<div class="recipe-authorship">${authorshipHtml.join('')}</div>`
        : '';

    const totalTimeMinutes = getTotalTimeMinutes(recipe);

    // Photo display with upload/delete controls
    const hasPhoto = recipe.photo_filename && recipe.photo_filename !== '';
    const photoHtml = hasPhoto
        ? `<div class="recipe-photo-container">
            <div class="recipe-photo-wrapper">
                <img src="/api/recipes/${recipe.id}/photo?t=${Date.now()}"
                     alt="${recipe.title} photo"
                     class="recipe-photo"
                     id="recipe-photo-img"
                     onclick="document.getElementById('photo-upload-input').click()"
                     title="Click to change photo"
                     onerror="this.closest('.recipe-photo-container').style.display='none';">
                <button class="photo-delete-x" onclick="deleteRecipePhoto('${recipe.id}')" title="Remove photo">&times;</button>
            </div>
            <input type="file" id="photo-upload-input" accept="image/*" style="display: none;" onchange="uploadRecipePhoto('${recipe.id}', this)">
           </div>`
        : '';

    // Small add-photo icon for title row (only when no photo)
    const addPhotoIcon = !hasPhoto
        ? `<button class="photo-add-icon" onclick="document.getElementById('photo-upload-input').click()" title="Add photo">
            <svg viewBox="0 0 24 24" width="18" height="18">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M3 14l5-5 4 4 6-6 5 5" stroke="currentColor" stroke-width="2" fill="none"/>
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
            </svg>
           </button>
           <input type="file" id="photo-upload-input" accept="image/*" style="display: none;" onchange="uploadRecipePhoto('${recipe.id}', this)">`
        : '';

    const ingredientsHtml = `
        <div class="recipe-title-row">
            <div class="recipe-title">${recipe.title || 'Untitled Recipe'}</div>
            ${addPhotoIcon}
        </div>
        ${photoHtml}

        <div class="section-header">ingredients:</div>
        <div class="ingredients-list">
            ${ingredientsList || '<div class="ingredient-line">No ingredients listed</div>'}
            ${recipe.servings ? `<div class="serving-note">--> serves ${recipe.servings}</div>` : ''}
        </div>

        <div class="recipe-meta">
            <div class="meta-item">
                <span class="meta-label">Difficulty</span>
                <div class="difficulty-dots">${difficultyDots}</div>
                <span class="meta-value">${difficulty ? `${difficulty}/5` : 'Not rated'}</span>
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
            ${totalTimeMinutes ? `
            <div class="meta-item">
                <span class="meta-label">Total time</span>
                <div class="meta-icon">
                    <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                </div>
                <span class="meta-value">${totalTimeMinutes} min</span>
            </div>
            ` : ''}
        </div>
    `;

    const preparationHtml = `
        <div class="section-header">preparation</div>

        <div class="prep-list">
            ${stepsList || '<div class="prep-step">No preparation steps listed</div>'}
        </div>

        ${recipe.notes ? `<div class="recipe-note">Note: ${recipe.notes}</div>` : ''}
        ${recipe.description ? `<div class="recipe-note">${recipe.description}</div>` : ''}
        ${authorship}
    `;

    if (isMobile()) {
        leftContent.innerHTML = ingredientsHtml + '<div style="margin-top: 30px;"></div>' + preparationHtml;
        rightContent.innerHTML = '';
    } else {
        leftContent.innerHTML = ingredientsHtml;
        rightContent.innerHTML = preparationHtml;
    }
}

// eslint-disable-next-line no-unused-vars -- Used in chat.html inline event handler
async function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();

    // Require either message text or an attached image
    if (!message && !attachedImage) return;

    input.value = '';
    // Reset textarea height after clearing
    input.style.height = 'auto';
    addMessage(message, 'user');
    setLoading(true);

    let streamedText = '';

    try {
        const payload = {
            message: message || "",  // Ensure message is never undefined
            conversation_id: conversationId
        };

        if (viewMode === 'recipe' && currentRecipeId) {
            payload.current_recipe = {
                recipe_id: String(currentRecipeId)
            };
            if (currentRecipeTitle) {
                payload.current_recipe.title = currentRecipeTitle;
            }
        }

        // Include image if attached
        if (attachedImage) {
            payload.image = {
                data: attachedImage.data,
                media_type: attachedImage.media_type
            };
            console.log('Sending message with image:', {
                textLength: message.length,
                imageSize: attachedImage.size,
                mediaType: attachedImage.media_type
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
                        } else if (parsed.duration_minutes !== undefined && parsed.label !== undefined) {
                            // timer_start event
                            startTimer(parsed.duration_minutes, parsed.label);
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

    // Clear attached image after successful send
    if (attachedImage) {
        removeImage();
    }

    setLoading(false);
}

// Recipe photo management functions
// eslint-disable-next-line no-unused-vars -- Called from HTML onclick attribute
async function uploadRecipePhoto(recipeId, inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    // Validate file size (5MB limit)
    const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_PHOTO_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        showError(`Photo too large (${sizeMB}MB). Maximum size is 5MB.`);
        inputElement.value = ''; // Clear input
        return;
    }

    // Show loading state
    const photoContainer = document.querySelector('.recipe-photo-container');
    if (photoContainer) {
        photoContainer.style.opacity = '0.6';
        photoContainer.style.pointerEvents = 'none';
    }

    try {
        const formData = new FormData();
        formData.append('photo', file);

        const response = await fetch(`/api/recipes/${recipeId}/photo`, {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 413) {
                showError('Photo too large. Maximum size is 5MB.');
            } else if (response.status === 400) {
                showError('Invalid photo format. Use JPG, PNG, WebP, or GIF.');
            } else {
                showError('Failed to upload photo. Please try again.');
            }
            console.error('Upload error:', response.status, errorText);
            return;
        }

        // Reload the recipe to show the new photo
        await fetchAndDisplayRecipe(recipeId);

        // Show success (optional)
        console.log('Photo uploaded successfully');
    } catch (error) {
        console.error('Photo upload error:', error);
        showError('Failed to upload photo. Please try again.');
    } finally {
        // Clear the input so the same file can be uploaded again
        inputElement.value = '';

        // Restore UI state
        if (photoContainer) {
            photoContainer.style.opacity = '1';
            photoContainer.style.pointerEvents = 'auto';
        }
    }
}

// eslint-disable-next-line no-unused-vars -- Called from HTML onclick attribute
async function deleteRecipePhoto(recipeId) {
    // Show confirmation dialog
    const confirmed = confirm('Are you sure you want to delete this photo?');
    if (!confirmed) return;

    // Show loading state
    const photoContainer = document.querySelector('.recipe-photo-container');
    if (photoContainer) {
        photoContainer.style.opacity = '0.6';
        photoContainer.style.pointerEvents = 'none';
    }

    try {
        const response = await fetch(`/api/recipes/${recipeId}/photo`, {
            method: 'DELETE',
            credentials: 'same-origin'
        });

        if (!response.ok) {
            const errorText = await response.text();
            showError('Failed to delete photo. Please try again.');
            console.error('Delete error:', response.status, errorText);
            return;
        }

        // Reload the recipe to remove the photo
        await fetchAndDisplayRecipe(recipeId);

        console.log('Photo deleted successfully');
    } catch (error) {
        console.error('Photo delete error:', error);
        showError('Failed to delete photo. Please try again.');
    } finally {
        // Restore UI state
        if (photoContainer) {
            photoContainer.style.opacity = '1';
            photoContainer.style.pointerEvents = 'auto';
        }
    }
}
