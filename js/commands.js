// Routes typed and spoken commands to windows, browser, media, or the model. Uses voice.js for replies.

async function processAvaCommand(text) {
    const commandText = text.trim().replace(/^(?:[ae]\.v\.a\.|[ae]va\b)[\s,:-]*/i, '');
    const command = commandText.toLowerCase();
    commStatus.innerText = `PROCESSING...`;
    commStatus.classList.add('highlight');
    if (checkRepeatCommand(command)) return;

    // Schedule questions must use STM data, never model-generated arrival guesses.
    const transitHandled = handleTransitCommand(commandText);
    if (transitHandled) {
        await transitHandled;
        return;
    }

    // Handle Twitch before generic commands (channel names can contain "move" or "close").
    const twitchCommand = commandText.replace(/[.!?]+$/, '').match(/^(?:open|launch|watch)(?:\s+browser)?\s+twitch(?:\s+channel)?(?:\s+(.+))?$/i);
    if (twitchCommand) {
        const reply = openTwitch((twitchCommand[1] || '').replace(/[.!?]+$/, ''));
        commStatus.innerText = reply;
        speak(reply);
        return;
    }
    // YouTube commands
const ytOpen = commandText.match(/^(?:open|launch|play|watch)(?:\s+on)?\s+youtube(?:\s+(.+))?$/i);
if (ytOpen) {
    const reply = openYouTube((ytOpen[1] || '').replace(/[.!?]+$/, ''));
    commStatus.innerText = reply.toUpperCase();
    speak(reply);
    return;
}
if (/^(?:close|hide)\s+youtube[.!]?$/i.test(commandText)) {
    closeYouTube();
    commStatus.innerText = 'YOUTUBE CLOSED';
    speak('YouTube panel closed.');
    return;
}

    if (/^(?:close|hide)\s+twitch(?:\s+(?:panel|channel))?[.!]?$/i.test(commandText)) {
        closeTwitch();
        commStatus.innerText = 'TWITCH CLOSED';
        speak('Twitch panel closed.');
        return;
    }

    // 1. Window Quadrant Grid / Main Master Display Commands
    if (command.includes("move") || command.includes("snap") || command.includes("put")) {
        let targetWin = null;
        if (command.includes("stm") || command.includes("transit")) targetWin = document.getElementById('transit-window');
        else if (command.includes("twitch")) targetWin = document.getElementById('twitch-window');
        else if (command.includes("youtube")) targetWin = document.getElementById('youtube-window');
        else if (command.includes("browser")) targetWin = document.getElementById('browser-window');
        else if (command.includes("media") || command.includes("recon")) targetWin = document.getElementById('media-window');
        else if (command.includes("env") || command.includes("weather") || command.includes("diagnostic")) targetWin = document.getElementById('env-window');
        else if (command.includes("itinerary") || command.includes("task") || command.includes("objective")) targetWin = document.getElementById('itinerary-window');
        else if (command.includes("comm") || command.includes("terminal") || command.includes("assistant")) targetWin = document.getElementById('comm-window');
        else targetWin = document.getElementById('comm-window');

        let pos = "";
        if (command.includes("main") || command.includes("center") || command.includes("middle")) pos = "main";
        else if (command.includes("top left")) pos = "top left";
        else if (command.includes("top right")) pos = "top right";
        else if (command.includes("top center") || command.includes("top middle")) pos = "top center";
        else if (command.includes("bottom left")) pos = "bottom left";
        else if (command.includes("bottom right")) pos = "bottom right";
        else if (command.includes("bottom center") || command.includes("bottom middle")) pos = "bottom center";
        else if (command.includes("middle left") || command.includes("center left")) pos = "middle left";
        else if (command.includes("middle right") || command.includes("center right")) pos = "middle right";

        if (targetWin && pos) {
            if (targetWin.style.display === 'none') targetWin.style.display = 'flex';
            moveWindowToQuadrant(targetWin, pos);
            speak(pos === 'main' ? "Locked to main display." : `Moving window to ${pos}.`);
            commStatus.innerText = `LOCKED TO ${pos.toUpperCase()}`;
            return;
        }
    }

    // 2. Browser commands
    if (command.includes("open browser") || command.includes("launch browser")) {
        browserWindow.style.display = 'flex';
        browserWindow.style.zIndex = ++highestZIndex;
        speak("Browser uplink established.");
        commStatus.innerText = "BROWSER ACTIVE";
        return;
    } else if (command.includes("close browser") || command.includes("hide browser")) {
        closeBrowser();
        speak("Browser uplink closed.");
        commStatus.innerText = "BROWSER CLOSED";
        return;
    } else if (command.includes("browse to") || command.includes("open website")) {
        let site = command.replace(/(browse to|open website)/g, "").trim();
        if (site) {
            navigateBrowser(site);
            speak(`Navigating to ${site}.`);
            commStatus.innerText = `BROWSING: ${site}`;
            return;
        }
    }

    // 4. Time command
    if (command.includes("time") && (command.includes("what") || command.includes("current"))) {
        const now = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        speak(`It is currently ${now}.`);
        commStatus.innerText = `TIME: ${now}`;
        return;
    }
    // 5. Google search command
    const googleMatch = commandText.match(/^(?:google|search google for)\s+(.+)$/i);
    if (googleMatch) {
        const query = googleMatch[1].trim();
        window.open('https://www.google.com/search?q=' + encodeURIComponent(query), '_blank');
        speak(`Searching Google for ${query}.`);
        commStatus.innerText = `GOOGLING: ${query.toUpperCase()}`;
        return;
    }

    // 3. Media search commands
    if (command.includes("show me") || command.includes("pull up") || command.includes("search for")) {
        let query = command.replace(/(show me|pull up images of|pull up a video of|pull up|search for)/g, "").trim();
        if(query) {
            speak(`Pulling up visual feeds for ${query}.`);
            fetchMedia(query);
            commStatus.innerText = `VISUALIZING: "${query}"`;
            return;
        }
    } else if (command.includes("hide") || command.includes("close")) {
        closeMedia();
        commStatus.innerText = "MEDIA UPLINK CLOSED.";
        speak("Closing visual uplink.");
        return;
    }

    await requestAiReply(text);
}
