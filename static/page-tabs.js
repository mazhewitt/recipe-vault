/**
 * Page Tabs Module
 * Owns the active Ingredients / Method / Notes tab for the right page.
 *
 * The active tab lives in one place only: #page-right[data-tab]. CSS decides
 * what that means at each breakpoint (desktop scrolls one long page and swaps
 * in the Notes panel; phone shows exactly one panel at a time).
 */

import { crossfadeElement, isAnimating } from './page-transitions.js';
import { openThreadTab } from './margin-notes.js';

// 'notes' stays legal on every viewport: the phone's paper tabs still offer it
// and #page-right[data-tab="notes"] still means the thread. Only the desktop
// affordance is gone - Notes is a left-page spread mode there.
const VALID_TABS = ['ingredients', 'method', 'notes'];

export let state = null;

/** @param {object} appState — the sharedState object built in app.js */
export function initializeState(appState) {
    state = appState;
}

// Local copy of the shared phone predicate. page-tabs must not import
// recipe-display (that would close a cycle recipe-display → page-tabs → …).
function isPhone() {
    return window.matchMedia('(max-width: 600px)').matches;
}

let bound = false;

// Phone only: each tab's own scroll position of #page-right, the element that
// scrolls the phone page. Recorded on the way out of a tab, restored on the
// way back in; resetTabScroll empties it when a different recipe opens.
const tabScroll = new Map();

/**
 * A newly opened recipe starts every tab at the top. Called on the
 * non-refresh path of fetchAndDisplayRecipe, never on a refresh, which keeps
 * its tab and scroll positions.
 */
export function resetTabScroll() {
    tabScroll.clear();
    if (!isPhone()) return;
    const pageRight = document.getElementById('page-right');
    if (pageRight) pageRight.scrollTop = 0;
}

/**
 * Binds ONE delegated click listener on `document` that routes clicks on
 * `[role="tab"][data-tab]` (both `.page-tabs` and `.edge-tabs`) to setActiveTab.
 * Call once from app.js DOMContentLoaded. Idempotent.
 */
export function initPageTabs() {
    if (bound) return;
    bound = true;

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[role="tab"][data-tab]');
        if (!btn) return;
        setActiveTab(btn.dataset.tab);
    });
}

/**
 * Switches the active tab.
 * @param {'ingredients'|'method'|'notes'} tab
 * @param {{force?: boolean, scroll?: boolean}} [options]
 *        force  — bypass the animation lock and the crossfade (used when a
 *                 recipe is (re)rendered). Implies scroll:false.
 *        scroll — desktop only; scroll the right page to the section header.
 *                 Defaults to true for user taps, false when force is set.
 * @returns {boolean} true if the tab was applied, false if the call was ignored
 *          (unknown tab, missing #page-right, or the animation lock was held).
 */
export function setActiveTab(tab, options = {}) {
    if (!VALID_TABS.includes(tab)) return false;

    const pageRight = document.getElementById('page-right');
    if (!pageRight) return false;

    const force = options.force === true;

    // A tab tap during a page turn (or another crossfade) is ignored — one lock.
    if (!force && isAnimating()) return false;

    const apply = () => {
        const outgoing = pageRight.dataset.tab;
        const switching = isPhone() && outgoing !== tab;
        if (switching) tabScroll.set(outgoing, pageRight.scrollTop);

        pageRight.dataset.tab = tab;

        // The incoming panel is displayed now (CSS keys off data-tab), so its
        // height is there to scroll; the browser clamps a stale position.
        if (switching) pageRight.scrollTop = tabScroll.get(tab) ?? 0;

        // The edge ribbons are plain page edges: nothing is drawn as selected
        document.querySelectorAll('[role="tab"][data-tab]:not(.edge-tab)').forEach(el => {
            const selected = el.dataset.tab === tab;
            el.classList.toggle('active', selected);
            el.setAttribute('aria-selected', String(selected));
        });

        if (tab === 'notes') {
            openThreadTab(document.querySelector('#page-right-content .notes-thread'));
        }

        // Desktop/tablet: ingredients and method share one scrolling page, so
        // activating a tab scrolls it to that section rather than swapping it.
        // Not in cook mode: the sections are on separate pages there, so there
        // is no header on this page to scroll to and scrolling anyway would
        // move the wrong one. The mode is read off the body rather than
        // imported - body[data-spread-mode] is its single source of truth.
        const cookMode = document.body.dataset.spreadMode === 'cook';
        if (!isPhone() && !cookMode && tab !== 'notes' && options.scroll !== false && !force) {
            const panel = document.querySelector(`#page-right-content .tab-panel[data-tab="${tab}"]`);
            const header = panel && panel.querySelector('.section-header');
            if (header) {
                // getBoundingClientRect deltas, not offsetTop: .page-content has
                // no positioned ancestor of its own, so offsetTop resolves
                // against .recipe-book and overshoots.
                const top = pageRight.scrollTop
                    + header.getBoundingClientRect().top
                    - pageRight.getBoundingClientRect().top;
                try {
                    pageRight.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
                } catch {
                    pageRight.scrollTop = Math.max(0, top);
                }
            }
        }
    };

    if (isPhone() && !force) {
        crossfadeElement(document.getElementById('page-right-content'), apply, 200);
    } else {
        apply();
    }

    return true;
}
