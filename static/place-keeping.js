/**
 * Place Keeping Module
 * Keeps the cook's place in a recipe: ingredient ticks and the "you are here"
 * step mark, remembered per recipe for the browser session, and the screen
 * wake lock while a recipe or meal plan is on the page.
 *
 * Ticks and marks change attributes only (data-ticked, aria-current); the
 * styles draw them without touching any box, so nothing on the page moves.
 */

/* global clearTimeout */
import { isAnimating } from './page-transitions.js';

const STORAGE_PREFIX = 'rv-place:';

/** The recipe whose ticks the page is showing (set by applyPlace). */
let placeRecipeId = null;

/** How long "Clear ticks" offers "Undo" after a clear. */
const UNDO_MS = 6000;

/** The last clear, while it can be undone: { recipeId, ticked, timer }. */
let pendingUndo = null;

function dropUndo() {
    if (pendingUndo) clearTimeout(pendingUndo.timer);
    pendingUndo = null;
}

// --- Storage (every access guarded: storage can be unavailable) ---

function storageKey(recipeId) {
    return `${STORAGE_PREFIX}${recipeId}`;
}

function readPlace(recipeId) {
    try {
        const raw = sessionStorage.getItem(storageKey(recipeId));
        const parsed = raw ? JSON.parse(raw) : null;
        return {
            ticked: Array.isArray(parsed?.ticked) ? parsed.ticked.filter(Number.isInteger) : [],
            step: Number.isInteger(parsed?.step) ? parsed.step : null,
        };
    } catch {
        return { ticked: [], step: null };
    }
}

function writePlace(recipeId, place) {
    try {
        if (place.ticked.length === 0 && place.step == null) {
            sessionStorage.removeItem(storageKey(recipeId));
        } else {
            sessionStorage.setItem(storageKey(recipeId), JSON.stringify(place));
        }
    } catch {
        // Storage full or unavailable: the marks still show for this render
    }
}

// --- Drawing ---

/**
 * Both pages. The ingredients panel is on one of them, or parked off the page
 * in contents mode - which is why renderRecipe hands applyPlace the markup it
 * has just written, and app.js re-applies the place when a mode change brings
 * the panel back.
 */
function placeRoots() {
    return [document.getElementById('page-left-content'), document.getElementById('page-right-content')]
        .filter(Boolean);
}

function drawPlace(place, roots = placeRoots()) {
    const ticked = new Set(place.ticked);
    for (const root of roots) {
        root.querySelectorAll('.ingredient-item[data-index]').forEach(item => {
            if (ticked.has(Number(item.dataset.index))) item.dataset.ticked = 'true';
            else item.removeAttribute('data-ticked');
        });
        root.querySelectorAll('.prep-step[data-step]').forEach(step => {
            if (Number(step.dataset.step) === place.step) step.setAttribute('aria-current', 'step');
            else step.removeAttribute('aria-current');
        });
        // Shown only while something is ticked, or as "Undo" just after a clear
        const undoable = pendingUndo != null && pendingUndo.recipeId === placeRecipeId;
        root.querySelectorAll('.clear-ticks').forEach(btn => {
            btn.hidden = place.ticked.length === 0 && !undoable;
            btn.textContent = undoable ? 'Undo' : 'clear ticks';
        });
    }
}

/**
 * Re-applies the stored ticks and step mark of `recipeId` to freshly rendered
 * markup. Called by renderRecipe on every render, refreshes included, with the
 * container it has just filled (the ingredients panel may be parked off the
 * page right after, so the page alone would miss it).
 *
 * @param {string|number} recipeId
 * @param {Element} [root] - the freshly rendered recipe; defaults to both pages
 */
export function applyPlace(recipeId, root) {
    placeRecipeId = recipeId == null ? null : String(recipeId);
    if (placeRecipeId == null) return;
    drawPlace(readPlace(placeRecipeId), root ? [root] : placeRoots());
}

function update(change) {
    if (placeRecipeId == null) return;
    const place = readPlace(placeRecipeId);
    change(place);
    writePlace(placeRecipeId, place);
    drawPlace(place);
}

function onClick(e) {
    const target = e.target;
    if (!target || typeof target.closest !== 'function') return;

    const clear = target.closest('.clear-ticks');
    if (clear) {
        if (pendingUndo && pendingUndo.recipeId === placeRecipeId) {
            const restore = pendingUndo.ticked;
            dropUndo();
            update(place => {
                place.ticked = restore;
            });
            return;
        }
        // Ticks only: the step mark is cleared by tapping the marked step
        const cleared = readPlace(placeRecipeId).ticked;
        dropUndo();
        pendingUndo = {
            recipeId: placeRecipeId,
            ticked: cleared,
            timer: setTimeout(() => {
                pendingUndo = null;
                if (placeRecipeId != null) drawPlace(readPlace(placeRecipeId));
            }, UNDO_MS),
        };
        update(place => {
            place.ticked = [];
        });
        return;
    }
    // Buttons and links inside a line keep their own job
    if (target.closest('button, a')) return;
    // A tap that lands while a page turns or a tab crossfades is not a tick
    if (isAnimating()) return;

    const item = target.closest('.ingredient-item[data-index]');
    if (item) {
        const index = Number(item.dataset.index);
        // A new tick ends the chance to undo the last clear
        dropUndo();
        update(place => {
            place.ticked = place.ticked.includes(index)
                ? place.ticked.filter(i => i !== index)
                : [...place.ticked, index].sort((a, b) => a - b);
        });
        return;
    }

    const step = target.closest('.prep-step[data-step]');
    if (step) {
        const n = Number(step.dataset.step);
        update(place => {
            place.step = place.step === n ? null : n;
        });
    }
}

// --- Wake lock ---

/** Whether a recipe or meal plan is displayed, so the screen should stay on. */
let wakeWanted = false;
let sentinel = null;
let requesting = false;

function wakeLockSupported() {
    return typeof navigator !== 'undefined' && 'wakeLock' in navigator
        && navigator.wakeLock && typeof navigator.wakeLock.request === 'function';
}

function dropSentinel() {
    const held = sentinel;
    sentinel = null;
    if (held && !held.released) {
        Promise.resolve().then(() => held.release()).catch(() => {});
    }
}

async function requestWakeLock() {
    if (!wakeLockSupported() || requesting) return;
    requesting = true;
    try {
        const next = await navigator.wakeLock.request('screen');
        // Back on the contents while the request was in flight
        if (!wakeWanted) {
            Promise.resolve().then(() => next.release()).catch(() => {});
            return;
        }
        dropSentinel();
        sentinel = next;
    } catch {
        // Refused (battery saver, not visible, permissions): carry on unlocked
    } finally {
        requesting = false;
    }
}

/**
 * Holds the screen wake lock while a recipe or meal plan is displayed. Paging
 * from one recipe to the next calls it again, and a lock already held is kept
 * rather than re-requested.
 */
export function holdWakeLock() {
    wakeWanted = true;
    if (sentinel && !sentinel.released) return;
    requestWakeLock();
}

/** Lets the screen sleep again: the contents page is not cooking. */
export function releaseWakeLock() {
    wakeWanted = false;
    dropSentinel();
}

function onVisibilityChange() {
    // The browser drops the lock whenever the page is hidden; take it again
    if (document.visibilityState === 'visible' && wakeWanted) requestWakeLock();
}

// --- Init ---

let bound = false;

/**
 * One delegated click listener per page (never touchstart: a scroll that
 * starts on a line must not tick it) and the visibility listener for the
 * wake lock. Safe to call more than once.
 */
export function initPlaceKeeping() {
    if (bound) return;
    bound = true;
    placeRoots().forEach(root => root.addEventListener('click', onClick));
    document.addEventListener('visibilitychange', onVisibilityChange);
}
