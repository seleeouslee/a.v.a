// Embedded browser navigation. Uses windows.js stacking order.

// --- BROWSER UPLINK LOGIC ---
const browserUrlInput = document.getElementById('browser-url-input');
const browserGoBtn = document.getElementById('browser-go-btn');
const browserIframe = document.getElementById('browser-iframe');
const browserWindow = document.getElementById('browser-window');

browserUrlInput.value = "https://en.wikipedia.org";

function closeBrowser() {
    browserIframe.src = 'about:blank';
    browserWindow.style.display = 'none';
}

function navigateBrowser(urlOrQuery) {
    let targetUrl = urlOrQuery.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(targetUrl)}`;
    }
    browserUrlInput.value = targetUrl;
    browserIframe.src = targetUrl;
    browserWindow.style.display = 'flex';
    browserWindow.style.zIndex = ++highestZIndex;
}

browserGoBtn.addEventListener('click', () => {
    navigateBrowser(browserUrlInput.value);
});

browserUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        navigateBrowser(browserUrlInput.value);
    }
});
