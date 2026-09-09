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

function onTimerComplete(label) {
    const timerText = document.getElementById('timer-text');
    timerText.textContent = `${label} - Done! ✓`;

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

    // Auto-hide after 3 seconds
    setTimeout(() => {
        const widget = document.getElementById('timer-widget');
        widget.style.display = 'none';
    }, 3000);
}

export function startTimer(durationMinutes, label, stepNumber) {
    // Clear any existing timer
    if (activeTimer) {
        clearInterval(activeTimer.interval);
    }

    const widget = document.getElementById('timer-widget');
    const timerText = document.getElementById('timer-text');

    let secondsLeft = Math.round(durationMinutes * 60);

    // Update display
    const updateDisplay = () => {
        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;
        timerText.textContent = `${label}: ${mins}:${secs.toString().padStart(2, '0')}`;
    };

    updateDisplay();
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

/**
 * True while a timer is running for the given recipe.
 *
 * The widget is not the answer and neither is the step highlight: #timer-widget
 * carries no recipe id and outlives the recipe it was started under (it stays
 * on screen while the reader pages to another recipe, and for three seconds
 * after the timer completes), and a timer can be set with no step at all. The
 * running timer's own recipe id is the only accurate one, so it is exposed
 * here rather than inferred from the DOM.
 *
 * @param {string|number|null} recipeId - the recipe on the page
 * @returns {boolean} true only when the running timer was started under it
 */
export function isTimerRunningFor(recipeId) {
    if (!activeTimer || recipeId == null || activeTimer.recipeId == null) return false;
    return String(recipeId) === String(activeTimer.recipeId);
}

export function cancelTimer() {
    if (activeTimer) {
        clearInterval(activeTimer.interval);
        activeTimer = null;
    }
    clearStepHighlight();
    const widget = document.getElementById('timer-widget');
    widget.style.display = 'none';
}
