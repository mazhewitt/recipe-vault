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
 *        render — false skips the registered renderer, for a caller that
 *                 draws the pages itself in the same task (navigation.js
 *                 showIndex).
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
    if (spreadRenderer && options.render !== false) spreadRenderer(mode);

    return true;
}

/**
 * Mirrors the current view mode and spread mode onto the left-edge strip.
 *
 * The strip is one <nav> holding two button sets — the contents filters and the
 * spread tabs:
 *   index  → the filters (All / Mains / Sweets / Meals), plus Notes
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
        const tab = btn.dataset.mode;
        // On the contents page the filters hold the strip, but Notes joins them:
        // it is the only way into the book-level thread now that focusing the
        // input no longer opens notes mode. Contents and Cook have nothing to
        // offer there — contents is already what the spread is showing, and
        // cook needs a recipe. A meal plan never offers Cook, for its own
        // reason: several recipes at once is the point of a meal.
        const visible = showSpreadTabs
            ? !(tab === 'cook' && viewMode === 'meal')
            : tab === 'notes';
        btn.hidden = !visible;

        const active = btn.dataset.mode === mode;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
    });
}

let bound = false;

/**
 * Binds the strip's listener and seeds the default mode.
 * Call once from app.js DOMContentLoaded. Idempotent.
 *
 * One delegated click listener on `document` routes clicks on
 * `.spread-tab[data-mode]` to setSpreadMode — the spread tabs carry no
 * role="tab" and no data-tab, so page-tabs.js's delegated handler never sees
 * them and the two strips stay independent.
 *
 * The tab is the only way into a mode. Nothing selects a mode implicitly except
 * opening a recipe (cook) and returning to the contents (contents), both driven
 * from the modules that own those transitions.
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

    // Focusing the input deliberately does NOT select notes mode. It used to,
    // and it made a click on the slip re-lay-out the book underneath the
    // cursor: the input sat at the foot of the right page, the focus put the
    // spread into notes mode, and the slip jumped across the spine to the left.
    // The slip now keeps one position in every mode that shows it, and the tab
    // is the only way into notes mode - explicit, and it cannot move the thing
    // being clicked.

    syncStrip();
}
