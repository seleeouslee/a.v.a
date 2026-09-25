// Shared header controls. Load after Twitch and transit close handlers.
(function () {
    document.querySelectorAll('.window').forEach(panel => {
        const header = panel.querySelector('.window-header');
        const title = header.textContent.trim();
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'panel-close-btn';
        button.textContent = '\u00d7';
        button.setAttribute('aria-label', `Close ${title}`);
        button.title = 'Close panel';
        button.addEventListener('click', () => {
            if (panel.id === 'twitch-window') closeTwitch();
            else if (panel.id === 'transit-window') closeTransit();
            else panel.style.display = 'none';
            document.getElementById('features-open-btn').focus();
        });
        header.appendChild(button);
    });
})();
