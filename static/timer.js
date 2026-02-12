/**
 * Timer Module
 * Handles cooking timer functionality
 */

// Timer state (module-scoped)
let activeTimer = null;

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

    // Auto-hide after 3 seconds
    setTimeout(() => {
        const widget = document.getElementById('timer-widget');
        widget.style.display = 'none';
    }, 3000);
}

export function startTimer(durationMinutes, label) {
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

    activeTimer = { interval, label };
}

export function cancelTimer() {
    if (activeTimer) {
        clearInterval(activeTimer.interval);
        activeTimer = null;
    }
    const widget = document.getElementById('timer-widget');
    widget.style.display = 'none';
}
