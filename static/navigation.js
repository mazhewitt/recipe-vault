/**
 * Navigation Module
 * Handles recipe navigation state (arrows, edge chevrons, phone footer links)
 */

import { animatePageTurn, isAnimating } from './page-transitions.js';
import { setNotePageNumber } from './recipe-display.js';

// Import global state accessors (will be set by app.js)
export let state = null;

export function initializeState(appState) {
    state = appState;
}

function findIndexById(list, id) {
    return list.findIndex(r => String(r.id) === String(id));
}

export async function updateNavigationState() {
    const prevBtn = document.getElementById('page-prev');
    const nextBtn = document.getElementById('page-next');
    const prevEdge = document.getElementById('mobile-edge-prev');
    const nextEdge = document.getElementById('mobile-edge-next');

    const list = await state.fetchRecipeList();

    let prevDisabled, nextDisabled;

    if (state.viewMode === 'index') {
        // On index: back arrow disabled, forward arrow enabled if recipes exist
        prevDisabled = true;
        nextDisabled = list.length === 0;
    } else if (!state.currentRecipeId) {
        // Fallback: no recipe displayed and not in index mode
        prevDisabled = list.length === 0;
        nextDisabled = list.length === 0;
    } else {
        const idx = findIndexById(list, state.currentRecipeId);

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
    if (prevBtn) prevBtn.disabled = prevDisabled;
    if (nextBtn) nextBtn.disabled = nextDisabled;

    // Update mobile edge navigation
    if (prevEdge) prevEdge.classList.toggle('disabled', prevDisabled);
    if (nextEdge) nextEdge.classList.toggle('disabled', nextDisabled);

    // Update the phone footer links, which recipe-display re-creates on every render
    document.querySelectorAll('.footer-prev').forEach(btn => { btn.disabled = prevDisabled; });
    document.querySelectorAll('.footer-next').forEach(btn => { btn.disabled = nextDisabled; });
}

export async function loadNextRecipe() {
    if (isAnimating()) return;

    // Fetch fresh list to ensure we're using up-to-date data after chat operations
    const list = await state.fetchRecipeList(true);
    if (list.length === 0) return;

    // If in index view, load first recipe
    if (state.viewMode === 'index') {
        await animatePageTurn('forward', () => state.fetchAndDisplayRecipe(list[0].id));
        return;
    }

    if (!state.currentRecipeId) {
        await animatePageTurn('forward', () => state.fetchAndDisplayRecipe(list[0].id));
        return;
    }
    const idx = findIndexById(list, state.currentRecipeId);
    if (idx === -1) {
        await animatePageTurn('forward', () => state.fetchAndDisplayRecipe(list[0].id));
        return;
    }
    if (idx < list.length - 1) {
        await animatePageTurn('forward', () => state.fetchAndDisplayRecipe(list[idx + 1].id));
    }
}

export async function loadPrevRecipe() {
    if (isAnimating()) return;

    // Fetch fresh list to ensure we're using up-to-date data after chat operations
    const list = await state.fetchRecipeList(true);
    if (list.length === 0) return;

    // If in index view, do nothing (back arrow should be disabled)
    if (state.viewMode === 'index') return;

    // If no recipe currently shown, clicking back should load the first recipe
    if (!state.currentRecipeId) {
        await animatePageTurn('backward', () => state.fetchAndDisplayRecipe(list[0].id));
        return;
    }

    const idx = findIndexById(list, state.currentRecipeId);
    if (idx === -1) {
        // Current recipe not found, return to index
        await animatePageTurn('backward', () => state.showIndex());
        return;
    }
    if (idx > 0) {
        await animatePageTurn('backward', () => state.fetchAndDisplayRecipe(list[idx - 1].id));
    } else {
        // At first recipe, return to index
        await animatePageTurn('backward', () => state.showIndex());
    }
}

export async function showIndex() {
    state.viewMode = 'index';
    state.currentRecipeId = null;
    state.currentRecipeTitle = null;
    // The contents page is page 1
    setNotePageNumber(null);
    const list = await state.fetchRecipeList(true);
    state.renderIndex(list, { currentRecipeId: state.lastRecipeId, filter: state.contentsFilter });
    updateNavigationState();
}

// Guard so initFooterNav can be called more than once without stacking listeners
let footerBound = false;

/**
 * Binds one delegated click listener for the phone footer links
 * (.footer-prev / .footer-next), which recipe-display re-creates on every
 * render. Clicks on a disabled link are ignored; loadPrevRecipe /
 * loadNextRecipe already bail while a page turn or crossfade is running.
 */
export function initFooterNav() {
    if (footerBound) return;
    footerBound = true;

    document.addEventListener('click', (e) => {
        const prev = e.target.closest('.footer-prev');
        if (prev) {
            if (!prev.disabled) loadPrevRecipe();
            return;
        }
        const next = e.target.closest('.footer-next');
        if (next) {
            if (!next.disabled) loadNextRecipe();
        }
    });
}
