/**
 * Spread Modes Module
 * Owns which of the three things the left page shows: the contents, the open
 * recipe's ingredients, or the conversation.
 *
 * The mode lives in one place only: body[data-spread-mode] (contents | cook |
 * notes), mirroring the body[data-view-mode] and #page-right[data-tab] pattern
 * already used elsewhere. CSS decides what each mode means at each breakpoint;
 * this module only writes the attribute, so anything that needs the mode —
 * a stylesheet, another module, a test — reads it off the body rather than
 * importing from here.
 *
 * Below 600px there is no spread, so there is no mode: every change is refused
 * and the phone keeps its single page with its Ingredients / Method / Notes
 * tabs.
 *
 * This module deliberately imports nothing but the animation lock. Reaching for
 * recipe-display.js or page-tabs.js would close an import cycle
 * (recipe-display → page-tabs → …), so the re-render that a mode change needs
 * is a callback app.js registers with registerSpreadRenderer().
 */

import { isAnimating } from './page-transitions.js';

const VALID_MODES = ['contents', 'cook', 'notes'];
const DEFAULT_MODE = 'contents';

// Shared app state (set by app.js)
export let state = null;

/** @param {object} appState — the sharedState object built in app.js */
export function initializeState(appState) {
    state = appState;
}

// Local copy of the shared phone predicate. spread-modes must not import
// recipe-display (that would close a cycle through page-tabs), so the media
// query is repeated here as page-tabs.js repeats it.
function isPhone() {
    return window.matchMedia('(max-width: 600px)').matches;
}

function currentViewMode() {
    if (state && state.viewMode) return state.viewMode;
    if (document.body) return document.body.dataset.viewMode;
    return undefined;
}

// The one re-render callback, registered by app.js.
let spreadRenderer = null;

/**
 * Registers the callback that re-draws the spread after a mode change.
 * One callback only; registering again replaces it.
 * @param {(mode: string) => void} fn - called with the newly applied mode
 */
export function registerSpreadRenderer(fn) {
    spreadRenderer = typeof fn === 'function' ? fn : null;
}

/**
 * The current spread mode, read from the body attribute that holds it.
 * @returns {'contents'|'cook'|'notes'} the default mode until one is set
 */
export function getSpreadMode() {
    const mode = document.body ? document.body.dataset.spreadMode : undefined;
    return VALID_MODES.includes(mode) ? mode : DEFAULT_MODE;
}

/**
 * Switches the spread mode.
 * @param {'contents'|'cook'|'notes'} mode
 * @param {{force?: boolean}} [options]
 *        force — bypass the animation lock. Used for the programmatic
 *                transitions that happen around a page turn (opening a recipe
 *                selects cook mode while the turn is still animating).
 * @returns {boolean} true if the mode was applied, false if the call was
 *          ignored (unknown mode, cook mode over a meal plan, a phone viewport,
 *          or the animation lock was held without force).
 */
export function setSpreadMode(mode, options = {}) {
    if (!VALID_MODES.includes(mode)) return false;

    // A meal plan never cooks: it is the one case where several recipes at once
    // is the point, and there is no single recipe to split across the spread.
    // Refused outright rather than only left off the strip, so the mode really
    // is contents or notes there whatever asks for it.
    if (mode === 'cook' && currentViewMode() === 'meal') return false;

    // No spread below 600px, so no mode to change.
    if (isPhone()) return false;

    // A mode change during a page turn (or another crossfade) is ignored — the
    // same one lock setActiveTab honours.
    if (options.force !== true && isAnimating()) return false;

    document.body.dataset.spreadMode = mode;
    syncStrip();
    if (spreadRenderer) spreadRenderer(mode);

    return true;
}

/**
 * Mirrors the current view mode and spread mode onto the left-edge strip.
 *
 * The strip is one <nav> holding two button sets — the contents filters and the
 * spread tabs — and exactly one set is on screen at a time:
 *   index  → the filters (All / Mains / Sweets / Meals)
 *   recipe → the spread tabs (Contents / Cook / Notes)
 *   meal   → the spread tabs without Cook; a meal is the one case where several
 *            recipes at once is the point, so it never enters cook mode
 * The <nav> itself is never removed: it is a sibling of #page-left-content
 * precisely so a contents re-render cannot take it with it.
 */
export function syncStrip() {
    const nav = document.querySelector('.contents-tabs');
    if (!nav) return;

    const viewMode = currentViewMode();
    const showSpreadTabs = viewMode === 'recipe' || viewMode === 'meal';
    const mode = getSpreadMode();

    nav.querySelectorAll('.contents-tab[data-filter]').forEach(btn => {
        // Meal plans are not persisted yet (RV-107), so the Meals filter stays
        // hidden until the feature flag is on the body — the same gate app.js
        // applies when it first reveals the tab.
        const gated = btn.classList.contains('contents-tab-meals')
            && document.body.dataset.featureMeals === undefined;
        btn.hidden = showSpreadTabs || gated;
    });

    nav.querySelectorAll('.spread-tab[data-mode]').forEach(btn => {
        const cookOnAMeal = btn.dataset.mode === 'cook' && viewMode === 'meal';
        btn.hidden = !showSpreadTabs || cookOnAMeal;

        const active = btn.dataset.mode === mode;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
    });
}

/**
 * True while a timer is running for the recipe on the page — the one case where
 * focusing the input must not take the method away.
 *
 * It has to be that recipe's timer. #timer-widget is no proxy for it: the
 * widget carries no recipe id and outlives the recipe it was started under (it
 * stays on screen while the reader pages on, and for three seconds after the
 * timer completes), so reading its visibility would silently refuse notes mode
 * on a recipe that has no timer at all. timer.js answers it accurately, and is
 * reached through the shared state's function table rather than an import —
 * this module imports nothing but the animation lock, and the state table is
 * how the modules that must not import each other already call one another.
 */
function isTimerRunningForOpenRecipe() {
    if (currentViewMode() !== 'recipe') return false;
    if (!state || typeof state.isTimerRunningFor !== 'function') return false;
    return state.isTimerRunningFor(state.currentRecipeId);
}

let bound = false;

/**
 * Binds the two listeners the strip needs and seeds the default mode.
 * Call once from app.js DOMContentLoaded. Idempotent.
 *
 * One delegated click listener on `document` routes clicks on
 * `.spread-tab[data-mode]` to setSpreadMode — the spread tabs carry no
 * role="tab" and no data-tab, so page-tabs.js's delegated handler never sees
 * them and the two strips stay independent.
 *
 * Focusing the note input opens notes mode, because a reader reaching for the
 * input wants room to write. The exception is a cook mid-recipe with a timer
 * running: there the method page is load-bearing and must not be swapped out
 * from under them for a one-word reply.
 */
export function initSpreadModes() {
    if (bound) return;
    bound = true;

    // Seeded directly rather than through setSpreadMode: the attribute is the
    // single source of truth and must exist from the first paint, including on
    // a phone, where every rule keyed off it is scoped out anyway.
    if (document.body && !VALID_MODES.includes(document.body.dataset.spreadMode)) {
        document.body.dataset.spreadMode = DEFAULT_MODE;
    }

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.spread-tab[data-mode]');
        if (!btn) return;
        setSpreadMode(btn.dataset.mode);
    });

    // focus does not bubble, so the delegation listens in the capture phase.
    document.addEventListener('focus', (e) => {
        const target = e.target;
        if (!target || target.id !== 'message-input') return;
        if (getSpreadMode() === 'cook' && isTimerRunningForOpenRecipe()) return;
        setSpreadMode('notes');
    }, true);

    syncStrip();
}
