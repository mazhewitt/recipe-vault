/**
 * Navigation Module
 * Handles recipe navigation state (arrows, phone gutter chevrons, phone footer links)
 */

import { animatePageTurn, isAnimating } from './page-transitions.js';
import { setNotePageNumber } from './recipe-display.js';
import { setSpreadMode } from './spread-modes.js';
import { releaseWakeLock } from './place-keeping.js';

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
    const prevGutter = document.getElementById('gutter-prev');
    const nextGutter = document.getElementById('gutter-next');

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

    // Update the phone gutter chevrons in the tab row
    if (prevGutter) prevGutter.disabled = prevDisabled;
    if (nextGutter) nextGutter.disabled = nextDisabled;

    // Update the phone footer links, which recipe-display re-creates on every render
    document.querySelectorAll('.footer-prev').forEach(btn => { btn.disabled = prevDisabled; });
    document.querySelectorAll('.footer-next').forEach(btn => { btn.disabled = nextDisabled; });
}

export async function loadNextRecipe() {
    if (isAnimating()) return;

    // The list already held: a turn must not wait on the network. Chat turns
    // that create, rename or delete a recipe refresh it (chat.js).
    const list = await state.fetchRecipeList();
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

    // The list already held: a turn must not wait on the network. Chat turns
    // that create, rename or delete a recipe refresh it (chat.js).
    const list = await state.fetchRecipeList();
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
        await turnToContents();
        return;
    }
    if (idx > 0) {
        await animatePageTurn('backward', () => state.fetchAndDisplayRecipe(list[idx - 1].id));
    } else {
        // At first recipe, return to index
        await turnToContents();
    }
}

/**
 * The "Recipe Book" header: one backward page turn to the contents while a
 * recipe or a meal plan is open, then one list refresh. On the contents it
 * does nothing.
 */
export async function returnToContents() {
    if (state.viewMode === 'index' || isAnimating()) return;
    await turnToContents();
}

/**
 * A backward turn to the contents (the header, and "previous" from the first
 * recipe). The pages are drawn from the held list inside the turn; the list is
 * refreshed once the turn has finished.
 */
async function turnToContents() {
    let generation = null;
    await animatePageTurn('backward', () => { generation = showIndex(); });
    if (generation != null) await state.refreshContents(generation);
}

/**
 * Shows the contents, drawn synchronously from the list already held.
 * @returns {number} the spread generation of the draw, for state.refreshContents
 */
export function showIndex() {
    state.viewMode = 'index';
    // Nothing is being cooked from the contents: let the screen sleep
    releaseWakeLock();
    state.currentRecipeId = null;
    state.currentRecipeTitle = null;
    // Back at the contents, the contents take the left page again and the strip
    // reverts to the filters (the view-mode change above has already swapped the
    // button sets; this presses the right one). force: showIndex is reached from
    // the back arrow inside a page turn, and the lock exists to reject the
    // reader's tab clicks, not this. render: false, because the draw below is
    // this function's: the mode change and the pages land in one task, so the
    // turn never uncovers a left page emptied while a list request is in flight.
    setSpreadMode('contents', { force: true, render: false });
    // The contents page is page 1
    setNotePageNumber(null);
    // Stamped with the spread generation, so a reader who picks another mode
    // before the refresh lands keeps it (state.refreshContents checks it).
    const generation = state.drawHeldContents();
    updateNavigationState();
    return generation;
}

// Guard so initFooterNav can be called more than once without stacking listeners
let footerBound = false;

/**
 * Binds one delegated click listener for the phone footer links
 * (.footer-prev / .footer-next), which recipe-display re-creates on every
 * render, and the phone gutter chevrons (#gutter-prev / #gutter-next). Clicks on a disabled link are ignored; loadPrevRecipe /
 * loadNextRecipe already bail while a page turn or crossfade is running.
 */
export function initFooterNav() {
    if (footerBound) return;
    footerBound = true;

    document.addEventListener('click', (e) => {
        const prev = e.target.closest('.footer-prev, #gutter-prev');
        if (prev) {
            if (!prev.disabled) loadPrevRecipe();
            return;
        }
        const next = e.target.closest('.footer-next, #gutter-next');
        if (next) {
            if (!next.disabled) loadNextRecipe();
        }
    });
}
