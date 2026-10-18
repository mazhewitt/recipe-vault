/**
 * Timer Module
 * Handles cooking timer functionality and the method-step highlight
 */

/* global clearTimeout */

import { animatePageTurn, isAnimating } from './page-transitions.js';
import { setActiveTab } from './page-tabs.js';

// Shared app state (set by app.js via initializeState)
let state = null;

// Timer state (module-scoped): { interval, label, recipeId, stepNumber, render }
let activeTimer = null;

export function initializeState(sharedState) {
    state = sharedState;
}

function clearStepHighlight() {
    document.querySelectorAll('.prep-step.timer-active').forEach(el => {
        el.classList.remove('timer-active');
    });
}

/**
 * Re-apply the step highlight for the displayed recipe.
 * No-op unless a timer with a step is running for that same recipe.
 */
export function applyStepHighlight(recipeId) {
    clearStepHighlight();
    if (!activeTimer || activeTimer.stepNumber == null) {
        return;
    }
    if (recipeId == null || activeTimer.recipeId == null || String(recipeId) !== String(activeTimer.recipeId)) {
        return;
    }
    const selector = `.prep-step[data-step="${activeTimer.stepNumber}"]`;
    ['page-left-content', 'page-right-content'].forEach(id => {
        const container = document.getElementById(id);
        if (!container) return;
        container.querySelectorAll(selector).forEach(el => el.classList.add('timer-active'));
    });
}

// Web Audio for the completion chime. Browsers refuse audio until the page
// has had a user gesture, so the context is created (or resumed) inside the
// first tap or keypress. Every call is guarded: no audio never breaks a timer.
let audioContext = null;

function getAudioContext() {
    try {
        if (!audioContext) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            audioContext = new Ctx();
        }
        if (audioContext.state === 'suspended') {
            const resumed = audioContext.resume();
            if (resumed && typeof resumed.catch === 'function') resumed.catch(() => {});
        }
    } catch {
        audioContext = null;
    }
    return audioContext;
}

function unlockAudio() {
    document.removeEventListener('pointerdown', unlockAudio, true);
    document.removeEventListener('keydown', unlockAudio, true);
    getAudioContext();
}

document.addEventListener('pointerdown', unlockAudio, true);
document.addEventListener('keydown', unlockAudio, true);

// Three rising notes from an oscillator - no audio file to load.
function playChime() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        [659.25, 783.99, 1046.5].forEach((freq, i) => {
            const start = now + i * 0.25;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.45);
        });
    } catch {
        // Audio is a bonus; the finished pill is the signal.
    }
}

// "Step N" for a step's own timer, "Step N · <label>" for an assistant timer
// on step N, "<label>" for one with no step (cooking-guidance "The pill names
// its step").
function pillLabel(label, step) {
    if (step == null) return label || '';
    const prefix = `Step ${step}`;
    return label && label !== prefix ? `${prefix} · ${label}` : prefix;
}

// The label and the time are two spans with no text node between them; the
// separator is drawn in the time's left margin (styles.css).
function setTimerText(label, time) {
    const timerText = document.getElementById('timer-text');
    timerText.replaceChildren();
    const labelSpan = document.createElement('span');
    labelSpan.className = 'timer-label';
    labelSpan.textContent = label;
    timerText.appendChild(labelSpan);
    if (time != null) {
        const timeSpan = document.createElement('span');
        timeSpan.className = 'timer-time';
        timeSpan.textContent = time;
        timerText.appendChild(timeSpan);
    }
}

// The finished pill chimes again every 15s until it is acknowledged, and
// gives up by itself 5 minutes after zero (the pill itself stays).
const CHIME_REPEAT_MS = 15000;
const CHIME_GIVE_UP_MS = 300000;
let chimeRepeat = null;
let chimeGiveUp = null;

function stopChimeRepeats() {
    clearInterval(chimeRepeat);
    clearTimeout(chimeGiveUp);
    chimeRepeat = null;
    chimeGiveUp = null;
}

function chimeAndVibrate() {
    playChime();
    try {
        navigator.vibrate?.([200, 100, 200]);
    } catch {
        // Vibration is optional
    }
}

// "Tap again to replace": a step's duration tapped while a timer runs.
const CONFIRM_MS = 4000;
const CONFIRM_LABEL = 'Tap again to replace';
let pendingConfirm = null; // { button, step, recipeId, timeout }

function clearConfirm() {
    if (!pendingConfirm) return;
    clearTimeout(pendingConfirm.timeout);
    delete pendingConfirm.button.dataset.confirm;
    pendingConfirm = null;
    if (activeTimer) activeTimer.render();
}

function hideWidget() {
    stopChimeRepeats();
    const widget = document.getElementById('timer-widget');
    widget.style.display = 'none';
    delete widget.dataset.state;
}

function onTimerComplete(label) {
    const widget = document.getElementById('timer-widget');
    setTimerText(`Done · ${label}`, null);
    widget.dataset.state = 'done';

    chimeAndVibrate();
    stopChimeRepeats();
    chimeRepeat = setInterval(chimeAndVibrate, CHIME_REPEAT_MS);
    chimeGiveUp = setTimeout(stopChimeRepeats, CHIME_GIVE_UP_MS);

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Recipe Vault Timer', {
            body: `${label} - Time's up!`,
            icon: '/favicon.ico',
            tag: 'recipe-timer'
        });
    }

    activeTimer = null;
    clearStepHighlight();
    // The finished pill stays until the cook taps it (see the click handler below)
}

/** Scroll the method so step n is wholly in view; only #page-right's scrollTop changes. */
function scrollStepIntoView(stepNumber) {
    const pageRight = document.getElementById('page-right');
    const el = document.querySelector(`#page-right-content .prep-step[data-step="${stepNumber}"]`);
    if (!pageRight || !el) return;
    const pr = pageRight.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.top >= pr.top && r.bottom <= pr.bottom) return;
    // Leave room above the step for the sticky header strip, if any
    pageRight.scrollTop += r.top - pr.top - 16;
}

async function goToTimerStep(timer) {
    const isPhone = window.matchMedia('(max-width: 600px)').matches;
    const showStep = () => {
        if (isPhone) setActiveTab('method', { force: true });
        scrollStepIntoView(timer.stepNumber);
    };
    const displayed = state && state.currentRecipeId != null
        && String(state.currentRecipeId) === String(timer.recipeId)
        && state.viewMode === 'recipe';
    if (displayed) {
        showStep();
        return;
    }
    if (!state || timer.recipeId == null || isAnimating()) return;
    // The way a contents row opens a recipe
    await animatePageTurn('forward', () => state.fetchAndDisplayRecipe(timer.recipeId));
    showStep();
}

// A tap anywhere on a finished pill acknowledges it; a tap on a running pill
// (not its ✕) brings the cook to the timer's step.
document.getElementById('timer-widget')?.addEventListener('click', (e) => {
    const widget = document.getElementById('timer-widget');
    if (widget.dataset.state === 'done') {
        hideWidget();
        return;
    }
    if (e.target.closest('.timer-cancel')) return;
    if (widget.dataset.state === 'running' && activeTimer && activeTimer.stepNumber != null) {
        goToTimerStep(activeTimer);
    }
});

export function startTimer(durationMinutes, label, stepNumber) {
    // Clear any existing timer, a finished one's chime and a pending confirm
    if (activeTimer) {
        clearInterval(activeTimer.interval);
    }
    stopChimeRepeats();
    if (pendingConfirm) {
        clearTimeout(pendingConfirm.timeout);
        delete pendingConfirm.button.dataset.confirm;
        pendingConfirm = null;
    }

    const widget = document.getElementById('timer-widget');

    let secondsLeft = Math.round(durationMinutes * 60);
    const step = Number.isInteger(stepNumber) && stepNumber > 0 ? stepNumber : null;
    const shownLabel = pillLabel(label, step);

    // Update display. The time keeps counting under "Tap again to replace",
    // but the prompt has the pill to itself so it is read in full.
    const updateDisplay = () => {
        if (pendingConfirm) {
            setTimerText(CONFIRM_LABEL, null);
            return;
        }
        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;
        setTimerText(shownLabel, `${mins}:${secs.toString().padStart(2, '0')}`);
    };

    updateDisplay();
    widget.dataset.state = 'running';
    widget.style.display = 'flex';

    // Count down every second
    const interval = setInterval(() => {
        secondsLeft--;

        if (secondsLeft <= 0) {
            clearInterval(interval);
            clearConfirm();
            onTimerComplete(shownLabel);
        } else {
            updateDisplay();
        }
    }, 1000);

    const recipeId = state ? state.currentRecipeId : null;
    activeTimer = { interval, label, recipeId, stepNumber: step, render: updateDisplay };

    applyStepHighlight(recipeId);
}

/**
 * A step's duration was tapped: start that step's timer, unless one is
 * running, in which case the first tap asks for a second within 4 seconds.
 */
export function startStepTimer(stepNumber, minutes, button) {
    if (isAnimating()) return;
    // The same step's button of the same recipe (a re-render may have
    // replaced the element)
    const recipeId = state ? state.currentRecipeId : null;
    if (activeTimer && !(pendingConfirm && pendingConfirm.step === stepNumber && pendingConfirm.recipeId === recipeId)) {
        clearConfirm();
        button.dataset.confirm = '';
        pendingConfirm = { button, step: stepNumber, recipeId, timeout: setTimeout(clearConfirm, CONFIRM_MS) };
        activeTimer.render();
        return;
    }
    startTimer(minutes, `Step ${stepNumber}`, stepNumber);
}

document.addEventListener('click', (e) => {
    const button = e.target && typeof e.target.closest === 'function' && e.target.closest('.step-duration');
    if (!button) return;
    const step = Number(button.closest('.prep-step[data-step]')?.dataset.step);
    const minutes = Number(button.dataset.minutes);
    if (!Number.isInteger(step) || !(minutes > 0)) return;
    startStepTimer(step, minutes, button);
});

export function cancelTimer() {
    if (pendingConfirm) {
        clearTimeout(pendingConfirm.timeout);
        delete pendingConfirm.button.dataset.confirm;
        pendingConfirm = null;
    }
    if (activeTimer) {
        clearInterval(activeTimer.interval);
        activeTimer = null;
    }
    clearStepHighlight();
    hideWidget();
}
