// Clickable feature launcher. Uses windows.js, media.js, and repeat.js.
(function () {
    'use strict';

    const dialog = document.getElementById('features-dialog');
    document.getElementById('features-open-btn').addEventListener('click', () => dialog.showModal());
    document.getElementById('features-close-btn').addEventListener('click', () => dialog.close());

    function openPanel(id, focusId) {
        dialog.close();
        const panel = document.getElementById(id);
        panel.style.display = 'flex';
        // Settings starts at z-index 999; keep launched panels above it too.
        highestZIndex = Math.max(highestZIndex, 999) + 1;
        panel.style.zIndex = highestZIndex;

        // Bring previously dragged panels back within reach on any viewport.
        const rect = panel.getBoundingClientRect();
        panel.style.transform = 'none';
        panel.style.left = Math.max(0, Math.min(rect.left, window.innerWidth - rect.width)) + 'px';
        panel.style.top = Math.max(0, Math.min(rect.top, window.innerHeight - rect.height)) + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        const focusTarget = focusId ? document.getElementById(focusId) : panel;
        if (!focusId) panel.tabIndex = -1;
        focusTarget.focus({ preventScroll: true });
    }

    dialog.querySelectorAll('[data-panel]').forEach(button => {
        button.addEventListener('click', () => openPanel(button.dataset.panel, button.dataset.focus));
    });
    document.getElementById('feature-repeat-btn').addEventListener('click', () => {
        openPanel('comm-window', 'manual-command-input');
        checkRepeatCommand('repeat');
    });

    document.getElementById('media-search-form').addEventListener('submit', event => {
        event.preventDefault();
        const query = document.getElementById('media-search-input').value.trim();
        if (query) fetchMedia(query);
    });
})();
