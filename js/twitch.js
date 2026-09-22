// Twitch channel playback and chat. Uses windows.js stacking order.
const twitchWindow = document.getElementById('twitch-window');
const twitchChannelInput = document.getElementById('twitch-channel-input');
const twitchStatus = document.getElementById('twitch-status');
const twitchPlayer = document.getElementById('twitch-player');
const twitchChat = document.getElementById('twitch-chat');
const twitchStreams = document.getElementById('twitch-streams');

function openTwitch(channelOrUrl = '') {
    twitchWindow.style.display = 'flex';
    twitchWindow.style.zIndex = ++highestZIndex;

    if (!channelOrUrl.trim()) {
        twitchChannelInput.focus();
        return 'Enter a Twitch channel name in the panel.';
    }

    // Accept a channel login or a direct channel URL, never arbitrary embed URLs.
    const match = channelOrUrl.trim().match(/^(?:(?:https?:\/\/)?(?:www\.)?twitch\.tv\/)?([a-z0-9_]{1,25})\/?$/i);
    if (!match) {
        twitchStatus.textContent = 'Enter a channel name or a twitch.tv/channel link.';
        return twitchStatus.textContent;
    }
    const channel = match[1].toLowerCase();
    twitchChannelInput.value = channel;

    if (!['http:', 'https:'].includes(window.location.protocol) || !window.location.hostname) {
        twitchStatus.textContent = 'Open A.V.A. on GitHub Pages or http://localhost:8000 to watch Twitch.';
        return twitchStatus.textContent;
    }

    // Twitch requires the hosting domain, without a protocol, port, or path.
    const parent = window.location.hostname;
    const playerParams = new URLSearchParams({ channel, parent, autoplay: 'false' });
    const chatParams = new URLSearchParams({ parent, darkpopout: '' });
    twitchPlayer.src = `https://player.twitch.tv/?${playerParams}`;
    twitchChat.src = `https://www.twitch.tv/embed/${channel}/chat?${chatParams}`;
    twitchStreams.hidden = false;
    twitchStatus.textContent = `${channel} — press Play to watch. Offline channels show their Twitch offline screen.`;
    return `Twitch channel ${channel} opened. Press Play to watch.`;
}

function closeTwitch() {
    // Unload both embeds so a closed panel cannot keep playing audio.
    twitchPlayer.src = 'about:blank';
    twitchChat.src = 'about:blank';
    twitchStreams.hidden = true;
    twitchWindow.style.display = 'none';
    twitchStatus.textContent = 'Enter a channel name to watch its stream and chat.';
}

document.getElementById('twitch-channel-form').addEventListener('submit', (event) => {
    event.preventDefault();
    openTwitch(twitchChannelInput.value);
});
document.getElementById('twitch-close-btn').addEventListener('click', closeTwitch);
