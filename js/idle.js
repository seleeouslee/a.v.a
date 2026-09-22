let idleTimer;
// Set to 5 minutes (5 * 60 * 1000 milliseconds)
const IDLE_TIMEOUT_MS = 5000; 

const idleScreen = document.getElementById('idle-screen');

function activateIdleScreen() {
    if (idleScreen) {
        idleScreen.classList.add('idle-active');
    }
}

function resetIdleTimer() {
    // If the idle screen is active, hide it when the user interacts
    if (idleScreen && idleScreen.classList.contains('idle-active')) {
        idleScreen.classList.remove('idle-active');
    }
    
    // Clear the existing timer and start a new 5-minute countdown
    clearTimeout(idleTimer);
    idleTimer = setTimeout(activateIdleScreen, IDLE_TIMEOUT_MS);
}

// Listen for any form of user interaction to reset the timer
['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'].forEach(event => {
    document.addEventListener(event, resetIdleTimer, true);
});

// Start the timer when the script first loads
resetIdleTimer();
