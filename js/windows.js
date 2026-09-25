// Dragging, snapping, stacking order, and quadrant placement.

const draggables = document.querySelectorAll('.draggable');
let highestZIndex = 11;
const SCREEN_SNAP = 30;
const WIN_SNAP = 15;

draggables.forEach(windowEl => {
    const header = windowEl.querySelector('.window-header');
    let isDragging = false, startX, startY, initialLeft, initialTop;

    if (windowEl.id === 'comm-window') {
        windowEl.style.left = (window.innerWidth / 2 - 170) + 'px';
    }

    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        windowEl.style.zIndex = ++highestZIndex;

        startX = e.clientX;
        startY = e.clientY;

        const rect = windowEl.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        windowEl.style.transform = 'none';
        windowEl.style.left = initialLeft + 'px';
        windowEl.style.top = initialTop + 'px';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        let newX = initialLeft + (e.clientX - startX);
        let newY = initialTop + (e.clientY - startY);

        const rect = windowEl.getBoundingClientRect();
        const winWidth = window.innerWidth;
        const winHeight = window.innerHeight;
        const currentWidth = rect.width;
        const currentHeight = rect.height;

        if (newX < SCREEN_SNAP) newX = 0;
        else if (newX + currentWidth > winWidth - SCREEN_SNAP) newX = winWidth - currentWidth;

        if (newY < SCREEN_SNAP) newY = 0;
        else if (newY + currentHeight > winHeight - SCREEN_SNAP) newY = winHeight - currentHeight;

        draggables.forEach(otherEl => {
            if (otherEl === windowEl) return;
            const oRect = otherEl.getBoundingClientRect();

            if (Math.abs(newX - oRect.right) < WIN_SNAP && newY + currentHeight > oRect.top && newY < oRect.bottom) {
                newX = oRect.right;
            }
            if (Math.abs((newX + currentWidth) - oRect.left) < WIN_SNAP && newY + currentHeight > oRect.top && newY < oRect.bottom) {
                newX = oRect.left - currentWidth;
            }
            if (Math.abs(newY - oRect.bottom) < WIN_SNAP && newX + currentWidth > oRect.left && newX < oRect.right) {
                newY = oRect.bottom;
            }
            if (Math.abs((newY + currentHeight) - oRect.top) < WIN_SNAP && newX + currentWidth > oRect.left && newX < oRect.right) {
                newY = oRect.top - currentHeight;
            }
        });

        windowEl.style.left = newX + 'px';
        windowEl.style.top = newY + 'px';
    });

    document.addEventListener('mouseup', () => isDragging = false);
});

// --- 9-QUADRANT & "MAIN" MASTER DISPLAY LOGIC ---
function moveWindowToQuadrant(windowEl, position) {
    if (!windowEl) return;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const cellW = Math.floor(screenW / 3);
    const cellH = Math.floor(screenH / 3);
    const margin = 10;

    let targetX = 0, targetY = 0, targetW = cellW - (margin * 2), targetH = cellH - (margin * 2);

    if (position === 'main') {
        targetW = Math.floor(cellW * 1.8);
        targetH = Math.floor(cellH * 1.8);
        targetX = Math.floor((screenW - targetW) / 2);
        targetY = Math.floor((screenH - targetH) / 2);
    } else {
        if (position.includes('left')) targetX = 0;
        else if (position.includes('right')) targetX = cellW * 2;
        else targetX = cellW;

        if (position.includes('top')) targetY = 0;
        else if (position.includes('bottom')) targetY = cellH * 2;
        else targetY = cellH;

        targetX += margin;
        targetY += margin;
        targetW -= margin;
        targetH -= margin;
    }

    windowEl.style.transform = 'none';
    windowEl.style.left = targetX + 'px';
    windowEl.style.top = targetY + 'px';
    windowEl.style.width = targetW + 'px';
    windowEl.style.height = targetH + 'px';
    windowEl.style.zIndex = ++highestZIndex;
}
