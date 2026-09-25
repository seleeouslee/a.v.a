// YouTube video playback inside A.V.A. Uses windows.js stacking order.
const youtubeWindow = document.getElementById('youtube-window');
const youtubeInput = document.getElementById('youtube-input');
const youtubeStatus = document.getElementById('youtube-status');
const youtubePlayer = document.getElementById('youtube-player');
const youtubePlayerWrap = document.getElementById('youtube-player-wrap');

function extractYouTubeId(text) {
    const t = (text || '').trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(t)) return t; // bare video ID
    const m = t.match(/(?:youtube\.com\/(?:watch\?[^#]*v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    return m ? m[1] : null;
}

function openYouTube(input = '') {
    youtubeWindow.style.display = 'flex';
    youtubeWindow.style.zIndex = ++highestZIndex;
    if (!input.trim()) {
        youtubeInput.focus();
        return 'Enter a YouTube link or video ID in the panel.';
    }
    const id = extractYouTubeId(input);
    if (!id) {
        youtubeStatus.textContent = 'That did not look like a YouTube link or video ID.';
        return youtubeStatus.textContent;
    }
    youtubePlayer.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    youtubePlayerWrap.hidden = false;
    youtubeStatus.textContent = 'Playing. Use the player fullscreen button for full screen.';
    return 'YouTube video opened.';
}

function closeYouTube() {
    // Unload the player so a closed panel cannot keep playing audio.
    youtubePlayer.src = 'about:blank';
    youtubePlayerWrap.hidden = true;
    youtubeWindow.style.display = 'none';
    youtubeStatus.textContent = 'Enter a YouTube link or video ID.';
}

document.getElementById('youtube-form').addEventListener('submit', (event) => {
    event.preventDefault();
    openYouTube(youtubeInput.value);
});
document.getElementById('youtube-close-btn').addEventListener('click', closeYouTube);
