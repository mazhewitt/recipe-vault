/**
 * Recipe Vault - Application Entry Point
 * Coordinates modules and handles initialization
 */

// Import modules
import * as RecipeDisplay from './recipe-display.js';
import * as Chat from './chat.js';
import * as Timer from './timer.js';
import * as Navigation from './navigation.js';
import * as PageTransitions from './page-transitions.js';

// Global state
let conversationId = null;
let currentRecipeId = null;
let currentRecipeTitle = null;
let recipeListCache = null;
let viewMode = 'index'; // 'index' | 'recipe'
let attachedImage = null; // Stores pasted image data

// Image size limit (5MB)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Shared utility: fetchRecipeList
async function fetchRecipeList(forceRefresh = false) {
    if (recipeListCache && !forceRefresh) return recipeListCache;
    if (forceRefresh) PageTransitions.clearPrefetchCache();
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

// Create shared state object for modules
const sharedState = {
    get conversationId() { return conversationId; },
    set conversationId(val) { conversationId = val; },
    get currentRecipeId() { return currentRecipeId; },
    set currentRecipeId(val) { currentRecipeId = val; },
    get currentRecipeTitle() { return currentRecipeTitle; },
    set currentRecipeTitle(val) { currentRecipeTitle = val; },
    get viewMode() { return viewMode; },
    set viewMode(val) { viewMode = val; },
    get attachedImage() { return attachedImage; },
    set attachedImage(val) { attachedImage = val; },

    // Shared functions
    fetchRecipeList,

    // Module functions (will be wired up after import)
    renderRecipe: RecipeDisplay.renderRecipe,
    renderIndex: RecipeDisplay.renderIndex,
    fetchAndDisplayRecipe: RecipeDisplay.fetchAndDisplayRecipe,
    updateNavigationState: Navigation.updateNavigationState,
    showIndex: Navigation.showIndex,
    startTimer: Timer.startTimer,
    cancelTimer: Timer.cancelTimer,
    removeImage: () => removeImage(),
};

// Initialize modules with shared state
RecipeDisplay.initializeState(sharedState);
Chat.initializeState(sharedState);
Timer.initializeState ? Timer.initializeState(sharedState) : null;
Navigation.initializeState(sharedState);
PageTransitions.initializeState(sharedState);

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
    if (imageFile.size > MAX_IMAGE_SIZE) {
        const sizeMB = (imageFile.size / (1024 * 1024)).toFixed(1);
        showError(`Image too large (${sizeMB}MB). Max size is 5MB.`);
        return;
    }

    try {
        const base64 = await fileToBase64(imageFile);
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

// Global functions for HTML onclick handlers and Playwright tests
window.sendMessage = Chat.sendMessage;
window.switchTab = Navigation.switchTab;
window.cancelTimer = Timer.cancelTimer;
window.removeImage = removeImage;
window.fetchAndDisplayRecipe = RecipeDisplay.fetchAndDisplayRecipe;
window.fetchRecipeList = fetchRecipeList;
window.loadNextRecipe = Navigation.loadNextRecipe;
window.loadPrevRecipe = Navigation.loadPrevRecipe;
window.updateNavigationState = Navigation.updateNavigationState;

// Setup functions
async function setupImagePasteHandler() {
    const messageInput = document.getElementById('message-input');
    if (!messageInput) return;

    messageInput.addEventListener('paste', async (e) => {
        const items = e.clipboardData.items;
        let imageFile = null;

        for (let item of items) {
            if (item.type.startsWith('image/')) {
                imageFile = item.getAsFile();
                break;
            }
            const file = item.getAsFile();
            if (file && file.type && file.type.startsWith('image/')) {
                imageFile = file;
                break;
            }
        }

        if (imageFile) {
            e.preventDefault();
            await handleImageFile(imageFile);
        }
    });
}

async function setupClipboardButton() {
    const button = document.getElementById('clipboard-button');
    const fileInput = document.getElementById('image-upload');

    if (button && fileInput) {
        button.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleImageFile(file);
        });
    }
}

function setupTextareaAutoResize() {
    const textarea = document.getElementById('message-input');
    if (!textarea) return;

    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
}

function setupNavigationButtons() {
    const prevBtn = document.getElementById('page-prev');
    const nextBtn = document.getElementById('page-next');
    const header = document.getElementById('recipe-book-header');
    const pagesContainer = document.querySelector('.pages-container');

    if (prevBtn) prevBtn.addEventListener('click', Navigation.loadPrevRecipe);
    if (nextBtn) nextBtn.addEventListener('click', Navigation.loadNextRecipe);
    if (header) header.addEventListener('click', Navigation.showIndex);

    // Delegated click listener for recipe photos
    if (pagesContainer) {
        let touchStartX = 0;
        let touchStartY = 0;
        let isTouch = false;

        pagesContainer.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('recipe-photo')) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                isTouch = true;
            }
        }, { passive: true });

        pagesContainer.addEventListener('touchend', (e) => {
            if (isTouch && e.target.classList.contains('recipe-photo')) {
                const dx = e.changedTouches[0].clientX - touchStartX;
                const dy = e.changedTouches[0].clientY - touchStartY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // If movement is small (a tap), show preview
                if (distance < 10) {
                    const url = e.target.getAttribute('data-preview-url') || e.target.src;
                    const alt = e.target.alt;
                    RecipeDisplay.showPhotoPreview(url, alt);
                }
            }
            isTouch = false;
        }, { passive: true });

        // Also handle mouse clicks for desktop
        pagesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('recipe-photo') && e.pointerType === 'mouse') {
                const url = e.target.getAttribute('data-preview-url') || e.target.src;
                const alt = e.target.alt;
                RecipeDisplay.showPhotoPreview(url, alt);
            }
        });
    }
}

function setupRecipePhotoUpload() {
    // Create a hidden file input for recipe photo uploads
    const photoInput = document.createElement('input');
    photoInput.type = 'file';
    photoInput.accept = 'image/*';
    photoInput.style.display = 'none';
    photoInput.id = 'recipe-photo-upload';
    document.body.appendChild(photoInput);

    let targetRecipeId = null;

    // Delegated click handler for add-photo buttons (they are re-rendered on each recipe)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.add-photo-btn');
        if (!btn) return;
        targetRecipeId = btn.dataset.recipeId;
        photoInput.value = '';
        photoInput.click();
    });

    photoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !targetRecipeId) return;

        if (file.size > MAX_IMAGE_SIZE) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            showError(`Image too large (${sizeMB}MB). Max size is 5MB.`);
            return;
        }

        const formData = new FormData();
        formData.append('photo', file);

        try {
            const resp = await fetch(`/api/recipes/${targetRecipeId}/photo`, {
                method: 'POST',
                credentials: 'same-origin',
                body: formData,
            });
            if (!resp.ok) {
                showError('Failed to upload photo.');
                return;
            }
            // Re-render the recipe to show the new photo
            await RecipeDisplay.fetchAndDisplayRecipe(targetRecipeId);
        } catch (err) {
            console.error('Photo upload error:', err);
            showError('Failed to upload photo.');
        }
    });
}

function setupMobileEdgeNavigation() {
    const prevEdge = document.getElementById('mobile-edge-prev');
    const nextEdge = document.getElementById('mobile-edge-next');

    if (prevEdge) {
        prevEdge.addEventListener('click', () => {
            if (!prevEdge.classList.contains('disabled')) {
                Navigation.loadPrevRecipe();
            }
        });
    }

    if (nextEdge) {
        nextEdge.addEventListener('click', () => {
            if (!nextEdge.classList.contains('disabled')) {
                Navigation.loadNextRecipe();
            }
        });
    }
}

function setupOrientationChangeHandler() {
    // Re-render index when viewport size changes (orientation change)
    window.addEventListener('resize', async () => {
        if (viewMode === 'index') {
            const list = await fetchRecipeList(true); // Force refresh to get latest recipes
            RecipeDisplay.renderIndex(list);
        }
    });
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Setup event handlers
    setupImagePasteHandler();
    setupClipboardButton();
    setupTextareaAutoResize();
    setupNavigationButtons();
    setupMobileEdgeNavigation();
    setupRecipePhotoUpload();
    setupOrientationChangeHandler();

    // Initialize swipe gestures for mobile page-turn navigation
    const pagesContainer = document.querySelector('.pages-container');
    if (pagesContainer) PageTransitions.initSwipeGestures(pagesContainer);

    // Load initial state
    const list = await fetchRecipeList();
    RecipeDisplay.renderIndex(list);
    Navigation.updateNavigationState();

    // Initialize mobile tab state (default to book tab)
    const isMobile = window.matchMedia('(max-width: 600px)').matches;
    if (isMobile) {
        Navigation.switchTab('book');
    }

    // Request notification permission for timers
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});
