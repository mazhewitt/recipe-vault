/**
 * Timer Module
 * Handles cooking timer functionality and the method-step highlight
 */

// Shared app state (set by app.js via initializeState)
let state = null;

// Timer state (module-scoped): { interval, label, recipeId, stepNumber }
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
        timerText.append(': ', timeSpan);
    }
}

function hideWidget() {
    const widget = document.getElementById('timer-widget');
    widget.style.display = 'none';
    delete widget.dataset.state;
}

function onTimerComplete(label) {
    const widget = document.getElementById('timer-widget');
    setTimerText(`Done — ${label}`, null);
    widget.dataset.state = 'done';

    playChime();
    try {
        navigator.vibrate?.([200, 100, 200]);
    } catch {
        // Vibration is optional
    }

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

// A tap anywhere on a finished pill acknowledges it
document.getElementById('timer-widget')?.addEventListener('click', () => {
    const widget = document.getElementById('timer-widget');
    if (widget.dataset.state === 'done') hideWidget();
});

export function startTimer(durationMinutes, label, stepNumber) {
    // Clear any existing timer
    if (activeTimer) {
        clearInterval(activeTimer.interval);
    }

    const widget = document.getElementById('timer-widget');

    let secondsLeft = Math.round(durationMinutes * 60);

    // Update display
    const updateDisplay = () => {
        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;
        setTimerText(label, `${mins}:${secs.toString().padStart(2, '0')}`);
    };

    updateDisplay();
    widget.dataset.state = 'running';
    widget.style.display = 'flex';

    // Count down every second
    const interval = setInterval(() => {
        secondsLeft--;

        if (secondsLeft <= 0) {
            clearInterval(interval);
            onTimerComplete(label);
        } else {
            updateDisplay();
        }
    }, 1000);

    const recipeId = state ? state.currentRecipeId : null;
    const step = Number.isInteger(stepNumber) && stepNumber > 0 ? stepNumber : null;
    activeTimer = { interval, label, recipeId, stepNumber: step };

    applyStepHighlight(recipeId);
}

export function cancelTimer() {
    if (activeTimer) {
        clearInterval(activeTimer.interval);
        activeTimer = null;
    }
    clearStepHighlight();
    hideWidget();
}
