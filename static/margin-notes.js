/**
 * Margin Notes Module
 * Owns the chat thread store and renders the reply sticky (#page-margin).
 *
 * The thread is the single record of the conversation for the page: replies,
 * errors and the user's own messages. Progress ("Thinking…", a tool's label)
 * is never stored: it is one transient in-flight line, set by chat.js through
 * setInFlight(). The sticky shows one note — the in-flight line while a turn
 * runs, otherwise the latest reply or error of the thread on display unless
 * the cook dismissed it. The whole thread is drawn into the Notes views by
 * renderThread().
 *
 * Every entry carries the recipe it was written under, so the sticky and the
 * Notes view show one recipe's conversation rather than the whole session.
 * The store itself is never filtered or cleared — the server keeps the full
 * conversation either way, so this is a display concern only.
 */

import { escapeHtml, renderMarkdown } from './utils.js';

// Gap between the sticky's bottom edge and the top of the note input
const STICKY_GAP = 4;
// The sticky's height cap, as a fraction of the page it sits on
const STICKY_MAX_FRACTION = 0.4;

// Shared app state (set by app.js)
export let state = null;

// Module-scoped thread: { id, kind, text, at, recipeId }, kind ∈ reply | status | error | user
// recipeId is the recipe that was displayed when the entry's turn began, as a
// string, or null for the book-level thread (the contents page or a meal plan)
const thread = [];
let nextId = 1;
let streamingId = null;
// The transient in-flight line ("Thinking…", a tool's label), or null
let inFlightText = null;
// Per thread (key: recipe id, '' for the book thread), the id of the note the
// cook dismissed. A newer reply has a different id, so it shows again.
const dismissed = new Map();

export function initializeState(appState) {
    state = appState;
}

/** A recipe id as the thread stores it: a string, or null for the book thread. */
function normalizeRecipeId(recipeId) {
    return recipeId == null ? null : String(recipeId);
}

/**
 * Appends an entry to the thread and re-renders the margin.
 * @param {string} text - Note text (markdown for replies, plain text otherwise)
 * @param {string} kind - 'reply' | 'status' | 'error' | 'user'
 * @param {string|number|null} recipeId - Recipe the entry belongs to, taken from
 *     the turn that produced it; null files it on the book-level thread
 * @returns {object} The stored thread entry
 */
export function addNote(text, kind = 'reply', recipeId = null) {
    const note = {
        id: nextId++,
        kind,
        text: text == null ? '' : String(text),
        at: Date.now(),
        recipeId: normalizeRecipeId(recipeId),
    };
    thread.push(note);
    render();
    return note;
}

/**
 * Grows the current streaming reply in place, creating it on the first chunk.
 * @param {string} text - The full reply text so far
 * @param {string|number|null} recipeId - Recipe the reply belongs to; stamped
 *     when the note is created and never revised, so a reply that lands after
 *     the reader has paged away stays with the recipe it was asked about
 */
export function updateStreamingNote(text, recipeId = null) {
    let note = thread.find(n => n.id === streamingId);
    if (!note) {
        note = {
            id: nextId++,
            kind: 'reply',
            text: '',
            at: Date.now(),
            recipeId: normalizeRecipeId(recipeId),
        };
        thread.push(note);
        streamingId = note.id;
    }
    note.text = text == null ? '' : String(text);
    render();
    return note;
}

/** Ends the streaming state; the note stays on the sticky. */
export function finalizeStreamingNote() {
    streamingId = null;
    render();
}

/** The full thread, oldest first (a copy — callers must not mutate it). */
export function getThread() {
    return thread.slice();
}

/** The displayed recipe's slice of the thread, oldest first (a copy). */
export function getVisibleThread() {
    return threadForDisplayedRecipe();
}

function currentViewMode() {
    if (state && state.viewMode) return state.viewMode;
    if (typeof document !== 'undefined' && document.body) return document.body.dataset.viewMode;
    return undefined;
}

/**
 * The recipe whose notes belong on the page right now: the open recipe's id
 * while one is displayed, otherwise null — the book-level thread, which is what
 * the contents page and a meal plan show.
 */
function displayedRecipeId() {
    if (currentViewMode() !== 'recipe') return null;
    return state && state.currentRecipeId != null ? String(state.currentRecipeId) : null;
}

/** Entries written under the recipe currently displayed, oldest first. */
function threadForDisplayedRecipe() {
    const recipeId = displayedRecipeId();
    return thread.filter(n => n.recipeId === recipeId);
}

function threadKey(recipeId) {
    return recipeId == null ? '' : recipeId;
}

/** The in-flight line as a note-shaped value; never stored in the thread. */
function inFlightNote() {
    return { id: 'in-flight', kind: 'status', text: inFlightText };
}

/** The latest reply or error of the thread on display, or null. */
function latestReply() {
    const notes = threadForDisplayedRecipe();
    for (let i = notes.length - 1; i >= 0; i--) {
        if (notes[i].kind === 'reply' || notes[i].kind === 'error') return notes[i];
    }
    return null;
}

/**
 * What the sticky holds: at most one note. The in-flight line wins while a turn
 * runs, on whichever page is displayed; otherwise the displayed thread's latest
 * reply or error, unless the cook dismissed that very note.
 */
function visibleNotes() {
    if (inFlightText !== null) return [inFlightNote()];
    const latest = latestReply();
    if (!latest) return [];
    if (dismissed.get(threadKey(displayedRecipeId())) === latest.id) return [];
    return [latest];
}

function classNameFor(note) {
    return 'margin-note' + (note.id === streamingId ? ' streaming' : '');
}

function bodyFor(note) {
    // Replies are AI-authored markdown; status/error text is plain and must be escaped
    return note.kind === 'reply' ? renderMarkdown(note.text) : escapeHtml(note.text);
}

/**
 * Sets or clears the transient in-flight line ("Thinking…", a tool's label).
 * It is shown on the sticky, and as the last entry of any on-screen thread,
 * but never stored, so the Notes view never lists it once the turn is over.
 * @param {string|null} text - the line, or null to clear it
 */
export function setInFlight(text) {
    inFlightText = text == null ? null : String(text);
    render();
}

/** Hides the sticky's note until a newer reply arrives in the same thread. */
function dismissLatest() {
    const latest = latestReply();
    if (latest) dismissed.set(threadKey(displayedRecipeId()), latest.id);
    render();
}

function dismissButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'note-dismiss';
    button.setAttribute('aria-label', 'Dismiss note');
    button.textContent = '✕';
    button.addEventListener('click', dismissLatest);
    return button;
}

/**
 * Renders the sticky's note into #page-margin.
 * The note element is reused while it is the same note, so a streaming reply's
 * fade-in plays once rather than on every chunk.
 */
export function render() {
    const container = document.getElementById('page-margin');
    if (!container) return;

    const note = visibleNotes()[0] || null;

    let el = container.querySelector(':scope > .margin-note');
    if (el && (!note || el.dataset.noteId !== String(note.id))) {
        el.remove();
        el = null;
    }
    if (note) {
        if (!el) {
            el = document.createElement('div');
            el.dataset.noteId = String(note.id);
            container.insertBefore(el, container.firstChild);
        }
        el.className = classNameFor(note);
        el.setAttribute('data-kind', note.kind);
        const body = bodyFor(note);
        // Only rewrite when the body actually changed: an aria-live region
        // re-announces its contents on every text replacement
        if (el.innerHTML !== body) el.innerHTML = body;
    }

    // A reply or error can be dismissed; the in-flight line goes by itself.
    // With no note the sticky is left truly :empty, which hides it.
    let button = container.querySelector(':scope > .note-dismiss');
    const dismissible = note && note.kind !== 'status';
    if (dismissible && !button) container.appendChild(button = dismissButton());
    if (!dismissible && button) button.remove();

    // Suppress announcements until the streaming note is complete
    container.setAttribute('aria-busy', streamingId === null ? 'false' : 'true');

    placeSticky();
    refreshOpenThread();
}

let placementObserved = false;

/**
 * Keeps the sticky's bottom edge STICKY_GAP above the note input and its height
 * at most STICKY_MAX_FRACTION of the page it sits on. Both depend on boxes CSS
 * cannot reach from #page-margin (the input's height grows with its textarea;
 * the page's height is not the containing block's), so they are measured and
 * handed to CSS as custom properties, and re-measured when those boxes resize.
 */
function placeSticky() {
    const container = document.getElementById('page-margin');
    const input = document.getElementById('note-input');
    // .book-container, the sticky's containing block at every width
    const host = container && container.parentElement;
    if (!container || !input || !host) return;

    const bottom = host.getBoundingClientRect().bottom - input.getBoundingClientRect().top + STICKY_GAP;
    // The page it sits on: the left page above 600px; on a phone whichever page
    // is displayed (the other has no height)
    const pageHeight = Math.max(
        ...['page-left', 'page-right'].map(id => {
            const page = document.getElementById(id);
            return page ? page.clientHeight : 0;
        })
    );
    // Above 600px the left-edge tab strip sits over the sticky's corner of the
    // page; on a short desktop a capped sticky would otherwise cover its lower
    // tabs (Notes among them), so the cap also stops STICKY_GAP below the strip
    let maxHeight = pageHeight * STICKY_MAX_FRACTION;
    const strip = document.querySelector('.contents-tabs');
    if (strip && window.getComputedStyle(strip).position === 'sticky') {
        const stripBottom = Math.max(0, ...[...strip.querySelectorAll('.contents-tab')]
            .map(tab => tab.getBoundingClientRect())
            .filter(r => r.height > 0)
            .map(r => r.bottom));
        if (stripBottom > 0) {
            const clearance = input.getBoundingClientRect().top - 2 * STICKY_GAP - stripBottom;
            maxHeight = Math.max(0, Math.min(maxHeight, clearance));
        }
    }
    container.style.setProperty('--sticky-bottom', `${bottom}px`);
    container.style.setProperty('--sticky-max-height', `${maxHeight}px`);
    updateStickyClearance(container, host);

    if (!placementObserved && typeof window.ResizeObserver !== 'undefined') {
        placementObserved = true;
        const observer = new window.ResizeObserver(() => placeSticky());
        [input, host, document.getElementById('page-left'), document.getElementById('page-right'),
            ...document.querySelectorAll('.contents-tabs .contents-tab')]
            .forEach(el => { if (el) observer.observe(el); });
    }
    if (!viewObserved && typeof window.MutationObserver !== 'undefined') {
        viewObserved = true;
        // A spread mode change or a phone tab switch draws a different view
        // without re-rendering the sticky, and the clearance belongs to the view
        const observer = new window.MutationObserver(() => placeSticky());
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-spread-mode', 'data-view-mode'] });
        const pageRight = document.getElementById('page-right');
        if (pageRight) observer.observe(pageRight, { attributes: true, attributeFilter: ['data-tab'] });
    }
}

let viewObserved = false;
// The foot clearance published for the view it was measured in
let stickyClearance = 0;
let clearanceView = null;

/**
 * Publishes --sticky-clearance on the book: the sticky's height plus its gap
 * above the slip, which the page under the sticky adds to its foot padding so
 * its last line can be scrolled clear. It never shrinks while the view lasts
 * (a dismissal at scroll end would otherwise clamp scrollTop and move the
 * page); a different recipe, the contents, a spread mode change or a phone tab
 * starts it again from 0. The Notes views have no sticky, so no clearance.
 */
function updateStickyClearance(container, host) {
    const phone = window.matchMedia('(max-width: 600px)').matches;
    const pageRight = document.getElementById('page-right');
    const phoneTab = phone && pageRight ? pageRight.dataset.tab : '';
    const spreadMode = phone ? '' : document.body.dataset.spreadMode;
    const view = [currentViewMode(), displayedRecipeId(), spreadMode, phoneTab, phone].join('|');
    if (view !== clearanceView) {
        clearanceView = view;
        stickyClearance = 0;
    }
    const noSticky = spreadMode === 'notes'
        || (phone && currentViewMode() === 'recipe' && phoneTab === 'notes');
    if (!noSticky && window.getComputedStyle(container).display !== 'none') {
        const height = container.getBoundingClientRect().height;
        if (height > 0) stickyClearance = Math.max(stickyClearance, Math.ceil(height + STICKY_GAP));
    }
    host.style.setProperty('--sticky-clearance', `${noSticky ? 0 : stickyClearance}px`);
}

/**
 * Keeps an on-screen thread live. The sticky and the thread are views of the
 * same store, and the Notes panel is on screen (in place of the recipe body)
 * while #page-right[data-tab="notes"] — on a phone the sticky is hidden
 * outright there, so without this a note sent from the Notes tab would be
 * rendered nowhere at all. Notes spread mode puts a second `.notes-thread` on
 * the left page, which is the same store again and must stay live too. No-op
 * where neither is present.
 */
function refreshOpenThread() {
    const pageRight = document.getElementById('page-right');
    if (pageRight && pageRight.dataset.tab === 'notes') {
        renderThread(document.querySelector('#page-right-content .notes-thread'));
    }
    const leftThread = document.querySelector('#page-left-content .notes-thread');
    if (leftThread) renderThread(leftThread);
}

/**
 * Renders the displayed recipe's thread — its user notes, replies and errors,
 * oldest first, then the in-flight line while a turn runs (shown, never
 * stored) — into the given container (the Notes tab's
 * `.notes-thread`, or the notes-mode left page). Entries belonging to another
 * recipe are not shown, so a recipe with no notes of its own gets the empty
 * message rather than the previous recipe's conversation. Idempotent; safe to
 * call on every Notes-tab activation. Never touches #page-margin and sets no
 * aria-live.
 * @param {Element|null} container - the `.notes-thread` element
 * @returns {number} number of entries rendered
 */
export function renderThread(container) {
    if (!container) return 0;

    const notes = threadForDisplayedRecipe();
    if (inFlightText !== null) notes.push(inFlightNote());

    if (notes.length === 0) {
        container.innerHTML = '<p class="notes-thread-empty">No notes yet.</p>';
        container.setAttribute('data-empty', 'true');
        return 0;
    }

    container.removeAttribute('data-empty');
    // bodyFor() keeps the sticky's XSS rules: only AI replies are markdown,
    // everything else — user notes included — is escaped
    container.innerHTML = notes.map(note =>
        `<div class="thread-note" data-kind="${note.kind}" data-note-id="${note.id}">${bodyFor(note)}</div>`
    ).join('');
    return notes.length;
}
