/**
 * Margin Notes Module
 * Owns the chat thread store and renders notes into the page margin.
 *
 * The thread is the single record of the conversation for the page: replies,
 * tool/timer status lines, errors and the user's own messages. Only the last
 * three non-user entries are drawn in the margin; the whole thread is drawn
 * into the Notes tab by renderThread().
 */

import { escapeHtml, renderMarkdown } from './utils.js';

const MAX_VISIBLE = 3;

// Shared app state (set by app.js)
export let state = null;

// Module-scoped thread: { id, kind, text, at }, kind ∈ reply | status | error | user
const thread = [];
let nextId = 1;
let streamingId = null;

export function initializeState(appState) {
    state = appState;
}

/**
 * Appends an entry to the thread and re-renders the margin.
 * @param {string} text - Note text (markdown for replies, plain text otherwise)
 * @param {string} kind - 'reply' | 'status' | 'error' | 'user'
 * @returns {object} The stored thread entry
 */
export function addNote(text, kind = 'reply') {
    const note = { id: nextId++, kind, text: text == null ? '' : String(text), at: Date.now() };
    thread.push(note);
    render();
    return note;
}

/**
 * Grows the current streaming reply in place, creating it on the first chunk.
 * @param {string} text - The full reply text so far
 */
export function updateStreamingNote(text) {
    let note = thread.find(n => n.id === streamingId);
    if (!note) {
        note = { id: nextId++, kind: 'reply', text: '', at: Date.now() };
        thread.push(note);
        streamingId = note.id;
    }
    note.text = text == null ? '' : String(text);
    render();
    return note;
}

/** Ends the streaming state; the note stays in the margin. */
export function finalizeStreamingNote() {
    streamingId = null;
    render();
}

/** The full thread, oldest first (a copy — callers must not mutate it). */
export function getThread() {
    return thread.slice();
}

function currentViewMode() {
    if (state && state.viewMode) return state.viewMode;
    if (typeof document !== 'undefined' && document.body) return document.body.dataset.viewMode;
    return undefined;
}

function visibleNotes(viewMode) {
    if (viewMode === 'index') {
        // Contents page: only the latest note (reply, status or error), as a sticky
        for (let i = thread.length - 1; i >= 0; i--) {
            if (thread[i].kind !== 'user') return [thread[i]];
        }
        return [];
    }
    return thread.filter(n => n.kind !== 'user').slice(-MAX_VISIBLE);
}

function classNameFor(note, viewMode) {
    if (viewMode === 'index') {
        return 'margin-note sticky-note' + (note.id === streamingId ? ' streaming' : '');
    }
    return 'margin-note' + (note.id === streamingId ? ' streaming' : '');
}

function bodyFor(note) {
    // Replies are AI-authored markdown; status/error text is plain and must be escaped
    return note.kind === 'reply' ? renderMarkdown(note.text) : escapeHtml(note.text);
}

/**
 * Renders the visible slice of the thread into #page-margin.
 * Existing note elements are reused so the fade-in does not replay on every
 * streaming chunk.
 */
export function render() {
    const container = document.getElementById('page-margin');
    if (!container) return;

    const viewMode = currentViewMode();
    const notes = visibleNotes(viewMode);

    const existing = Array.from(container.children);
    const byId = new Map(existing.map(el => [el.dataset.noteId, el]));
    const kept = [];

    for (const note of notes) {
        const key = String(note.id);
        let el = byId.get(key);
        if (!el) {
            el = document.createElement('div');
            el.dataset.noteId = key;
        }
        el.className = classNameFor(note, viewMode);
        el.setAttribute('data-kind', note.kind);
        const body = bodyFor(note);
        // Only rewrite when the body actually changed: an aria-live region
        // re-announces its contents on every text replacement
        if (el.innerHTML !== body) el.innerHTML = body;
        kept.push(el);
    }

    for (const el of existing) {
        if (!kept.includes(el)) el.remove();
    }
    // Put the kept elements in thread order (oldest first), touching the DOM only
    // where the order is actually wrong: re-inserting a connected node detaches
    // and re-inserts it, which cancels and restarts its fade-in and makes the
    // aria-live region re-announce it
    kept.forEach((el, i) => {
        if (container.children[i] !== el) {
            container.insertBefore(el, container.children[i] || null);
        }
    });

    // Suppress announcements until the streaming note is complete
    container.setAttribute('aria-busy', streamingId === null ? 'false' : 'true');

    refreshOpenThread();
}

/**
 * Keeps an open Notes tab live. The margin and the thread are two views of the
 * same store, and the Notes panel is on screen (in place of the recipe body)
 * while #page-right[data-tab="notes"] — on a phone the margin is hidden
 * outright there, so without this a note sent from the Notes tab would be
 * rendered nowhere at all. No-op when the tab is not open.
 */
function refreshOpenThread() {
    const pageRight = document.getElementById('page-right');
    if (!pageRight || pageRight.dataset.tab !== 'notes') return;
    renderThread(document.querySelector('#page-right-content .notes-thread'));
}

/**
 * Renders the FULL session thread — user notes, replies, status lines and
 * errors, oldest first — into the given container (the Notes tab's
 * `.notes-thread`). Idempotent; safe to call on every Notes-tab activation.
 * Never touches #page-margin and sets no aria-live.
 * @param {Element|null} container - the `.notes-thread` element
 * @returns {number} number of entries rendered
 */
export function renderThread(container) {
    if (!container) return 0;

    if (thread.length === 0) {
        container.innerHTML = '<p class="notes-thread-empty">No notes yet.</p>';
        container.setAttribute('data-empty', 'true');
        return 0;
    }

    container.removeAttribute('data-empty');
    // bodyFor() keeps the margin's XSS rules: only AI replies are markdown,
    // everything else — user notes included — is escaped
    container.innerHTML = thread.map(note =>
        `<div class="thread-note" data-kind="${note.kind}" data-note-id="${note.id}">${bodyFor(note)}</div>`
    ).join('');
    return thread.length;
}
