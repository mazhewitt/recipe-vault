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
import * as MealPlanDisplay from './meal-plan-display.js';
import * as MarginNotes from './margin-notes.js';
import * as PageTabs from './page-tabs.js';
import * as SpreadModes from './spread-modes.js';

// Global state
let conversationId = null;
let currentRecipeId = null;
let currentRecipeTitle = null;
let recipeListCache = null;
let viewMode = 'index'; // 'index' | 'recipe' | 'meal'
let attachedImage = null; // Stores pasted image data
let lastRecipeId = null; // Last recipe displayed this session (for contents highlight)
let photoEpoch = 0; // Bumped after photo uploads to bust thumbnail cache

// Image size limit (5MB)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Contents filter tab. sessionStorage, not localStorage: a reload keeps the
// chosen tab but a fresh browser session opens the book on All.
const CONTENTS_FILTER_KEY = 'rv-contents-filter';

function readStoredContentsFilter() {
    try {
        const stored = sessionStorage.getItem(CONTENTS_FILTER_KEY);
        return RecipeDisplay.CONTENTS_FILTERS.includes(stored) ? stored : 'all';
    } catch {
        // Storage can be unavailable (private mode); All is the safe default
        return 'all';
    }
}

let contentsFilter = readStoredContentsFilter();

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
    // The margin and the Notes page show one recipe's conversation, so changing
    // which recipe is on the page re-projects them — otherwise a reply that
    // lands after the reader has paged on keeps the previous recipe's notes
    // in the margin until the next note arrives.
    set currentRecipeId(val) { currentRecipeId = val; MarginNotes.render(); },
    get currentRecipeTitle() { return currentRecipeTitle; },
    set currentRecipeTitle(val) { currentRecipeTitle = val; },
    get viewMode() { return viewMode; },
    // Mirrored to the body so CSS can key the margin column off the current view;
    // the margin re-projects because the visible slice and styling depend on the mode
    set viewMode(val) {
        viewMode = val;
        document.body.dataset.viewMode = val;
        // A meal plan is the one case where several recipes at once is the
        // point, so it never cooks: a cook attribute carried over from the
        // recipe the reader came from would hide the plan's margin and edge
        // tabs and leave that recipe's ingredients on the left page. (Returning
        // to the contents is navigation.js showIndex's own call, which reverts
        // the mode whatever it was.)
        if (val === 'meal' && SpreadModes.getSpreadMode() === 'cook') {
            SpreadModes.setSpreadMode('contents', { force: true });
        }
        // spread-modes.js cannot watch the view mode without importing this
        // module, so the strip is told from here — the one place that sees
        // every change of it. syncContentsTabs re-asserts the remembered filter
        // on the buttons the strip has just brought back.
        SpreadModes.syncStrip();
        syncContentsTabs();
        MarginNotes.render();
    },
    get attachedImage() { return attachedImage; },
    set attachedImage(val) { attachedImage = val; },
    // Recipe most recently displayed this session; survives returning to the contents page
    get lastRecipeId() { return lastRecipeId; },
    set lastRecipeId(val) { lastRecipeId = val; },
    // Bumped after a photo upload so contents thumbnails refetch
    get photoEpoch() { return photoEpoch; },
    set photoEpoch(val) { photoEpoch = val; },
    // Active contents tab; mirrored to sessionStorage so a reload keeps it
    get contentsFilter() { return contentsFilter; },
    set contentsFilter(val) {
        contentsFilter = RecipeDisplay.CONTENTS_FILTERS.includes(val) ? val : 'all';
        try {
            sessionStorage.setItem(CONTENTS_FILTER_KEY, contentsFilter);
        } catch {
            // Storage can be unavailable (private mode); the filter still applies
        }
    },

    // Shared functions
    fetchRecipeList,

    // Module functions (will be wired up after import)
    renderRecipe: RecipeDisplay.renderRecipe,
    // navigation.js draws the contents through this rather than renderIndex:
    // it is the one contents render that carries the spread generation, so a
    // mode the reader picks while the recipe list is in flight still wins.
    renderContents: () => renderContents(),
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
Timer.initializeState(sharedState);
Navigation.initializeState(sharedState);
PageTransitions.initializeState(sharedState);
MealPlanDisplay.initializeState(sharedState);
MarginNotes.initializeState(sharedState);
PageTabs.initializeState(sharedState);
SpreadModes.initializeState(sharedState);

// spread-modes.js owns the mode but imports none of the rendering modules, so
// the re-draw a mode change needs is this callback.
SpreadModes.registerSpreadRenderer(renderSpread);

// Seed the body attributes with the initial view and spread modes
document.body.dataset.viewMode = viewMode;
document.body.dataset.spreadMode = 'contents';

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
        indicator.hidden = false;
    }
}

function removeImage() {
    attachedImage = null;
    const indicator = document.getElementById('image-attachment');
    if (indicator) {
        indicator.hidden = true;
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'paste-error';
    errorDiv.textContent = message;

    const host = document.querySelector('.note-input');
    if (host) {
        host.insertBefore(errorDiv, host.firstChild);
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
window.startTimer = Timer.startTimer;
window.cancelTimer = Timer.cancelTimer;
window.removeImage = removeImage;
window.fetchAndDisplayRecipe = RecipeDisplay.fetchAndDisplayRecipe;
window.renderMealPlan = MealPlanDisplay.renderMealPlan;
window.fetchRecipeList = fetchRecipeList;
window.loadNextRecipe = Navigation.loadNextRecipe;
window.loadPrevRecipe = Navigation.loadPrevRecipe;
window.updateNavigationState = Navigation.updateNavigationState;
window.getMarginThread = MarginNotes.getThread;
window.setActiveTab = PageTabs.setActiveTab;
window.setSpreadMode = SpreadModes.setSpreadMode;
window.getSpreadMode = SpreadModes.getSpreadMode;

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

function setupNoteInput() {
    const form = document.getElementById('note-input');
    const input = document.getElementById('message-input');

    if (form) {
        form.addEventListener('submit', (e) => { e.preventDefault(); Chat.sendMessage(); });
    }

    // Enter sends, Shift+Enter inserts a newline
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); Chat.sendMessage(); }
        });
    }
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
            photoEpoch += 1;
            await RecipeDisplay.fetchAndDisplayRecipe(targetRecipeId);
        } catch (err) {
            console.error('Photo upload error:', err);
            showError('Failed to upload photo.');
        }
    });
}

function setupShareButton() {
    // Delegated click handler for share buttons (they are re-rendered on each recipe)
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.share-btn');
        if (!btn) return;
        const recipeId = btn.dataset.recipeId;
        if (!recipeId) return;

        btn.disabled = true;
        try {
            const resp = await fetch(`/api/recipes/${recipeId}/share`, {
                method: 'POST',
                credentials: 'same-origin',
            });
            if (!resp.ok) {
                showError('Failed to create share link.');
                return;
            }
            const data = await resp.json();
            const fullUrl = `${window.location.origin}${data.url}`;

            // Copy to clipboard (may fail without secure context)
            let copied = false;
            try {
                await navigator.clipboard.writeText(fullUrl);
                copied = true;
            } catch {
                // Clipboard API not available (non-HTTPS) — fall back to prompt
                window.prompt('Copy this share link:', fullUrl);
            }

            // Show confirmation toast
            const toast = document.createElement('div');
            toast.className = 'share-toast';
            toast.textContent = copied ? 'Link copied!' : 'Link created!';
            btn.parentElement.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('show'));
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 2000);
        } catch (err) {
            console.error('Share error:', err);
            showError('Failed to share recipe.');
        } finally {
            btn.disabled = false;
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

/**
 * Mirrors the active filter onto the tab strip. Scoped to the filter buttons:
 * the strip also holds the spread tabs, which wear the same .contents-tab face
 * but track the spread mode and are spread-modes.js's to press.
 */
function syncContentsTabs() {
    document.querySelectorAll('.contents-tab[data-filter]').forEach(btn => {
        const active = btn.dataset.filter === contentsFilter;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
    });
}

/** The live ingredients panel, whichever page is currently holding it. */
function ingredientsPanel() {
    return document.querySelector('.tab-panel[data-tab="ingredients"]');
}

/**
 * Puts a relocated ingredients panel back on the right page, before the method
 * so document order is the order renderRecipe emitted. A move, never a copy:
 * applyStepHighlight and the tab machinery each use a single querySelector, so
 * the document must never hold two ingredients panels.
 */
function restoreIngredientsPanel() {
    const panel = document.querySelector('#page-left-content .tab-panel[data-tab="ingredients"]');
    const rightContent = document.getElementById('page-right-content');
    if (!panel || !rightContent) return;

    const method = rightContent.querySelector('.tab-panel[data-tab="method"]');
    if (method) {
        rightContent.insertBefore(panel, method);
    } else {
        // The right page has moved on to the contents or a meal plan, so the
        // panel belongs to no recipe on screen. Dropping it keeps the document
        // to one ingredients panel; the next renderRecipe emits a fresh one.
        panel.remove();
    }
}

/**
 * The spread mode the pages are actually being drawn for.
 *
 * Below 600px there is no spread, so there is no mode — but the attribute is
 * left saying whatever the spread was, because setSpreadMode refuses to write
 * it on a phone and the reader gets their mode back when the viewport crosses
 * 600px again. Every render decision below therefore asks this rather than
 * spread-modes.js directly: on a phone a stale `notes` would put the contents
 * on a right page the phone hides, and a stale `cook` would leave the filter
 * strip with nothing to re-render.
 *
 * @returns {'contents'|'cook'|'notes'} the mode in force at this viewport
 */
function effectiveSpreadMode() {
    return RecipeDisplay.isMobile() ? 'contents' : SpreadModes.getSpreadMode();
}

// Bumped by every call that decides what the pages hold. renderContents has to
// await the recipe list, and the reader can change the mode inside that round
// trip: a contents render that resolved after a switch to cook would overwrite
// #page-left-content and destroy the only ingredients panel in the document.
// The generation it was started under is its licence to write.
let spreadGeneration = 0;

/**
 * Re-draws the spread for the mode spread-modes.js has just written to the
 * body. Registered with registerSpreadRenderer, which is how that module gets
 * a re-render without importing recipe-display.js or page-tabs.js.
 *
 * The right page is renderRecipe's throughout, so all this decides is what the
 * left page holds:
 *   contents - the contents, one column while a recipe or meal plan is open
 *   cook     - the open recipe's ingredients, moved off the right page
 *   notes    - the conversation for the recipe on the page, plus the input
 *              (which CSS alone slides across the spine)
 *
 * @param {'contents'|'cook'|'notes'} mode - the mode just applied
 */
function renderSpread(mode) {
    const leftContent = document.getElementById('page-left-content');
    if (!leftContent) return;

    // Whatever the mode, this call is now the one that decides what the pages
    // hold; anything still in flight from the last one is stale.
    spreadGeneration++;

    if (mode === 'cook') {
        const panel = ingredientsPanel();
        // No recipe rendered yet: leave the left page alone. renderRecipe
        // re-asserts the mode when it does render, which lands back here.
        if (!panel) return;
        leftContent.innerHTML = '';
        leftContent.appendChild(panel);
        return;
    }

    // Every other mode gives the right page its ingredients back first: the
    // left page is about to be rewritten, and that would destroy the only copy.
    restoreIngredientsPanel();

    if (mode === 'notes') {
        // SAFE: static markup; renderThread fills the thread and keeps the
        // margin's XSS rules (only AI replies are markdown)
        leftContent.innerHTML = '<div class="notes-page"><div class="notes-thread"></div></div>';
        MarginNotes.renderThread(leftContent.querySelector('.notes-thread'));
        // On the contents page the index is a two-page split, and the thread
        // has just taken the half that carries the title and the A-Z strip.
        // The whole list moves across to the right page rather than being left
        // as a severed second half. With a recipe or a plan open the right page
        // is theirs and there is nothing to move.
        if (viewMode === 'index') renderContents(mode);
        return;
    }

    renderContents(mode);
}

/**
 * Re-renders whichever contents arrangement is on screen, with the active filter.
 *
 * @param {'contents'|'cook'|'notes'} [mode] - the mode the pages are being drawn
 *        for. Defaults to the mode in force at this viewport; renderSpread
 *        passes the mode it was called with, so a redraw and the arrangement it
 *        is drawing can never disagree.
 */
async function renderContents(mode = effectiveSpreadMode()) {
    const generation = ++spreadGeneration;
    const list = await fetchRecipeList(true);
    // Superseded while the list was in flight: the pages belong to whatever
    // asked for them next.
    if (generation !== spreadGeneration) return;

    if (viewMode === 'index') {
        // In notes mode the thread holds the left page, so the contents go on
        // the right as one column instead of splitting across the spread.
        if (mode === 'notes') {
            RecipeDisplay.renderIndex(list, {
                currentRecipeId: lastRecipeId, singleColumn: true, page: 'right', filter: contentsFilter,
            });
        } else {
            RecipeDisplay.renderIndex(list, { currentRecipeId: lastRecipeId, filter: contentsFilter });
        }
    } else {
        // A recipe (or a meal plan) holds the right page; the contents stay on the left
        RecipeDisplay.renderIndex(list, { currentRecipeId, singleColumn: true, filter: contentsFilter });
    }
}

/**
 * Wires the contents filter tabs. The strip is static markup in chat.html, so
 * one listener on the nav survives every contents re-render. The tabs are a
 * lens on the contents page only - navigation still walks the full list.
 */
function setupContentsTabs() {
    const nav = document.querySelector('.contents-tabs');
    if (!nav) return;

    // Meal plans are not persisted yet (RV-107), so the Meals tab stays hidden
    // until something sets the feature flag on the body.
    if (document.body.dataset.featureMeals !== undefined) {
        nav.querySelectorAll('.contents-tab-meals').forEach(btn => { btn.hidden = false; });
    }

    syncContentsTabs();

    nav.addEventListener('click', (e) => {
        // The spread tabs share the strip and the .contents-tab face but carry
        // no data-filter; spread-modes.js has its own delegated listener for
        // them, and reading one here would reset the filter to All.
        const btn = e.target.closest('.contents-tab[data-filter]');
        if (!btn) return;
        sharedState.contentsFilter = btn.dataset.filter;
        syncContentsTabs();
        // A filter tap is a request to read the contents, so it also brings
        // them back to the left page if notes mode has taken it. The mode
        // change re-renders through renderSpread, so render here only when it
        // was refused *and* the contents are on the left page anyway: on a
        // phone, where there are no spread modes and the call is always
        // refused, or when the mode was already contents. A refusal from the
        // animation lock leaves the left page as it is - the filter is
        // remembered and applies to the next render.
        const applied = SpreadModes.setSpreadMode('contents');
        if (!applied && effectiveSpreadMode() === 'contents') renderContents();
    });
}

function setupOrientationChangeHandler() {
    // Re-render index when viewport size changes (orientation change)
    window.addEventListener('resize', () => {
        // Cook and notes modes own the left page, so the contents must not be
        // rendered over them - which is why this goes through renderSpread
        // rather than renderIndex directly. Crossing 600px is the case worth
        // spelling out: below it there is no spread at all, so
        // effectiveSpreadMode reads contents whatever the body says, a
        // relocated ingredients panel goes back to the one page the reader can
        // see, and the contents are drawn across the pages again. The attribute
        // survives the trip (spread-modes.js refuses to write it on a phone),
        // so the reader's mode is re-applied on the way back up.
        renderSpread(effectiveSpreadMode());
    });
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Setup event handlers
    setupImagePasteHandler();
    setupClipboardButton();
    setupTextareaAutoResize();
    setupNoteInput();
    setupNavigationButtons();
    setupMobileEdgeNavigation();
    setupRecipePhotoUpload();
    setupShareButton();
    setupContentsTabs();
    setupOrientationChangeHandler();
    PageTabs.initPageTabs();
    SpreadModes.initSpreadModes();
    Navigation.initFooterNav();

    // Initialize swipe gestures for mobile page-turn navigation
    const pagesContainer = document.querySelector('.pages-container');
    if (pagesContainer) PageTransitions.initSwipeGestures(pagesContainer);

    // Load initial state
    const list = await fetchRecipeList();
    RecipeDisplay.renderIndex(list, { currentRecipeId: lastRecipeId, filter: contentsFilter });
    Navigation.updateNavigationState();

    // Request notification permission for timers
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});
