const canvas = document.getElementById('ai-brain-canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const aiChars = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()<>{}[]/\\|'.split('');
const fontSize = 16;
let columns = canvas.width / fontSize;
let drops = [];

for (let x = 0; x < columns; x++) {
    drops[x] = Math.random() * canvas.height;
}

function drawAiStream() {
    ctx.fillStyle = 'rgba(0, 5, 10, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const rootStyles = getComputedStyle(document.documentElement);
    const themeColor = rootStyles.getPropertyValue('--hud-cyan').trim() || '#00f3ff';

    ctx.fillStyle = themeColor;
    ctx.font = fontSize + 'px "Rajdhani", monospace';
    ctx.fontWeight = 'bold';

    for (let i = 0; i < drops.length; i++) {
        const text = aiChars[Math.floor(Math.random() * aiChars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

//setInterval(drawAiStream, 45);

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = canvas.width / fontSize;
    drops = [];
    for (let x = 0; x < columns; x++) {
        drops[x] = Math.random() * canvas.height;
    }
});

const keysPressed = new Set();
document.addEventListener('keydown', (e) => {
    keysPressed.add(e.key.toLowerCase());

    if ((keysPressed.has('control') || e.ctrlKey || keysPressed.has('meta')) &&
        keysPressed.has('a') &&
        keysPressed.has('m')) {
        e.preventDefault();

        const apiWindow = document.getElementById('api-config');
        apiWindow.style.display = (apiWindow.style.display === 'none' || apiWindow.style.display === '') ? 'flex' : 'none';
    }
});

document.addEventListener('keyup', (e) => {
    keysPressed.delete(e.key.toLowerCase());
});

const themeSelect = document.getElementById('theme-select');
const savedTheme = localStorage.getItem('stark_theme') || 'cyan';
themeSelect.value = savedTheme;
applyTheme(savedTheme);

function applyTheme(themeName) {
    const root = document.documentElement;
    if (themeName === 'cyan') {
        root.style.setProperty('--hud-cyan', '#00f3ff');
        root.style.setProperty('--hud-cyan-dim', 'rgba(0, 243, 255, 0.2)');
    } else if (themeName === 'crimson') {
        root.style.setProperty('--hud-cyan', '#ff3333');
        root.style.setProperty('--hud-cyan-dim', 'rgba(255, 51, 51, 0.2)');
    } else if (themeName === 'gold') {
        root.style.setProperty('--hud-cyan', '#ffcc00');
        root.style.setProperty('--hud-cyan-dim', 'rgba(255, 204, 0, 0.2)');
    }
}

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

function updateTime() {
    const now = new Date();
    document.getElementById('clock').innerText = now.toLocaleTimeString('en-US', { hour12: false });
    document.getElementById('date').innerText = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
setInterval(updateTime, 1000);
updateTime();

// --- BROWSER UPLINK LOGIC ---
const browserUrlInput = document.getElementById('browser-url-input');
const browserGoBtn = document.getElementById('browser-go-btn');
const browserIframe = document.getElementById('browser-iframe');
const browserWindow = document.getElementById('browser-window');

browserUrlInput.value = "https://en.wikipedia.org";

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

const manualLocInput = document.getElementById('manual-location-input');
manualLocInput.value = localStorage.getItem('stark_location') || '';

async function fetchWeather(lat, lon, cityName = null) {
    try {
        if (!cityName) {
            const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
            const geoData = await geoRes.json();
            cityName = geoData.city || geoData.locality || 'Unknown Sector';
        }
        document.getElementById('location-name').innerText = `LOC: ${cityName}`;

        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const weatherData = await weatherRes.json();
        const temp = Math.round(weatherData.current_weather.temperature);
        const code = weatherData.current_weather.weathercode;

        document.getElementById('temperature').innerText = `${temp}°C`;

        let condition = "Clear";
        if (code >= 1 && code <= 3) condition = "Partly Cloudy";
        if (code >= 51 && code <= 67) condition = "Raining";
        if (code >= 71 && code <= 77) condition = "Snowing";
        if (code >= 95) condition = "Thunderstorm";

        document.getElementById('weather-desc').innerText = `COND: ${condition.toUpperCase()}`;

        let clothing = "";
        if (temp < 5) clothing = "Thermal layers and heavy coat required.";
        else if (temp < 15) clothing = "Light jacket or sweater recommended.";
        else if (temp < 25) clothing = "Standard attire optimal.";
        else clothing = "Cooling system active. Light fabrics advised.";

        if (condition === "Raining" || condition === "Thunderstorm") clothing += " Waterproof exterior needed.";

        document.getElementById('clothing-rec').innerText = `> ${clothing}`;

    } catch (e) {
        console.error("Weather sensor failure:", e);
        document.getElementById('weather-desc').innerText = "SENSOR DISCONNECTED";
    }
}

async function initSensors() {
    const manualCity = localStorage.getItem('stark_location');
    if (manualCity) {
        try {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${manualCity}&count=1&language=en&format=json`);
            const geoData = await geoRes.json();
            if (geoData.results && geoData.results.length > 0) {
                const loc = geoData.results[0];
                fetchWeather(loc.latitude, loc.longitude, loc.name);
                return;
            }
        } catch (e) { console.error("Geocoding failed", e); }
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
            (err) => fetchWeather(45.5017, -73.5673, "Montreal (Fallback)")
        );
    } else {
        fetchWeather(45.5017, -73.5673, "Montreal (Fallback)");
    }
}
initSensors();

const llmEndpointInput = document.getElementById('llm-endpoint-input');
const llmModelInput = document.getElementById('llm-model-input');
const apiKeyInput = document.getElementById('api-key-input');
const notionSecretInput = document.getElementById('notion-secret-input');
const notionDbInput = document.getElementById('notion-db-input');
const saveKeyBtn = document.getElementById('save-key-btn');
const apiConfigWindow = document.getElementById('api-config');

let LLM_ENDPOINT = localStorage.getItem('stark_llm_endpoint') || 'http://localhost:11434/v1/chat/completions';
let LLM_MODEL = localStorage.getItem('stark_llm_model') || 'llama3';
let LLM_API_KEY = localStorage.getItem('stark_llm_key') || '';
let NOTION_SECRET = localStorage.getItem('stark_notion_secret') || '';
let NOTION_DB = localStorage.getItem('stark_notion_db') || '';

llmEndpointInput.value = LLM_ENDPOINT;
llmModelInput.value = LLM_MODEL;
apiKeyInput.value = LLM_API_KEY;
notionSecretInput.value = NOTION_SECRET;
notionDbInput.value = NOTION_DB;

saveKeyBtn.addEventListener('click', () => {
    LLM_ENDPOINT = llmEndpointInput.value || 'http://localhost:11434/v1/chat/completions';
    LLM_MODEL = llmModelInput.value || 'llama3';
    LLM_API_KEY = apiKeyInput.value;
    NOTION_SECRET = notionSecretInput.value;
    NOTION_DB = notionDbInput.value;

    const selectedTheme = themeSelect.value;
    const selectedLocation = manualLocInput.value;

    localStorage.setItem('stark_llm_endpoint', LLM_ENDPOINT);
    localStorage.setItem('stark_llm_model', LLM_MODEL);
    if (LLM_API_KEY) localStorage.setItem('stark_llm_key', LLM_API_KEY);
    if (NOTION_SECRET) localStorage.setItem('stark_notion_secret', NOTION_SECRET);
    if (NOTION_DB) localStorage.setItem('stark_notion_db', NOTION_DB);

    localStorage.setItem('stark_theme', selectedTheme);
    localStorage.setItem('stark_location', selectedLocation);

    applyTheme(selectedTheme);
    initSensors();

    apiConfigWindow.style.display = 'none';
});

document.getElementById('auth-notion-btn').addEventListener('click', async () => {
    if (!NOTION_SECRET || !NOTION_DB) {
        alert("Please enter your Notion credentials in the System Preferences (CTRL+A+M).");
        return;
    }
    await fetchNotionData();
});

async function fetchNotionData() {
    const syncBtn = document.getElementById('auth-notion-btn');
    const listEl = document.getElementById('schedule-list');

    syncBtn.innerText = "SYNCING...";
    listEl.innerHTML = '<li>Accessing mainframe...</li>';

    const proxyUrl = 'https://corsproxy.io/?';
    const targetUrl = `https://api.notion.com/v1/databases/${NOTION_DB}/query`;

    try {
        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_SECRET}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        const data = await response.json();

        if (data.results) {
            syncBtn.innerText = "NOTION SYNCED";
            syncBtn.classList.add('highlight');
            listEl.innerHTML = '';

            data.results.forEach((page, index) => {
                let taskName = "Unnamed Directive";
                if (page.properties.Name && page.properties.Name.title.length > 0) {
                    taskName = page.properties.Name.title[0].plain_text;
                }

                listEl.innerHTML += `
                    <li>
                        <input type="checkbox" id="ntn-task${index}">
                        <label for="ntn-task${index}">${taskName}</label>
                    </li>`;
            });
        } else {
            listEl.innerHTML = `<li>Error: ${data.message || 'Unknown API error'}</li>`;
            syncBtn.innerText = "SYNC FAILED";
        }
    } catch (err) {
        console.error("Notion fetch error:", err);
        listEl.innerHTML = '<li>CONNECTION ERROR. Check console.</li>';
        syncBtn.innerText = "SYNC FAILED";
    }
}

// --- A.V.A. STERN WAKE-WORD VOICE ENGINE ---
const startCommBtn = document.getElementById('start-comm-btn');
const commStatus = document.getElementById('comm-status');
const visualizer = document.getElementById('voice-visualizer');
const manualCmdInput = document.getElementById('manual-command-input');

let commActive = false;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

function speak(text, callback) {
    if (!window.speechSynthesis) {
        if (callback) callback();
        return;
    }
    window.speechSynthesis.cancel();

    if (recognition) {
        try { recognition.stop(); } catch(e) {}
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;

    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v =>
        v.name.includes('Google UK English Female') ||
        v.name.includes('Samantha') ||
        v.name.includes('Victoria') ||
        v.name.includes('Zira') ||
        (v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
    );
    if (femaleVoice) utterance.voice = femaleVoice;

    utterance.onend = () => {
        if (callback) callback();
        if (commActive && recognition) {
            setTimeout(() => {
                try { recognition.start(); } catch(e) {}
            }, 400);
        }
    };

    window.speechSynthesis.speak(utterance);
}

if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {};
}

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        commStatus.innerText = "LISTENING (SAY 'AVA' TO COMMAND)...";
        commStatus.classList.add('highlight');
        visualizer.classList.add('active');
    };

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
        }
        manualCmdInput.value = transcript;
        commStatus.innerText = `HEARING: "${transcript}"`;

        if (event.results[event.results.length - 1].isFinal) {
            const textLower = transcript.toLowerCase();

            // STRICT GATE: Must contain wake word 'ava'
            if (textLower.includes("ava") || textLower.includes("a.v.a.")) {
                let commandPart = transcript.replace(/ava|a\.v\.a\./gi, "").trim();

                if (commandPart.length > 0) {
                    processAvaCommand(commandPart);
                } else {
                    speak("Online. What do you need?");
                    commStatus.innerText = "ONLINE // AWAITING DIRECTIVE";
                }
            } else {
                commStatus.innerText = "IGNORED (NO WAKE WORD 'AVA')";
                setTimeout(() => {
                    if (commActive) commStatus.innerText = "LISTENING (SAY 'AVA' TO COMMAND)...";
                }, 1500);
            }
        }
    };

    recognition.onerror = (event) => {
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
            commStatus.innerText = `COMM ERROR: ${event.error.toUpperCase()}`;
        }
    };

    recognition.onend = () => {
        if (commActive && !window.speechSynthesis.speaking) {
            try {
                recognition.start();
            } catch(e) {}
        }
    };
} else {
    commStatus.innerText = "SPEECH-TO-TEXT NOT SUPPORTED.";
}

startCommBtn.addEventListener('click', () => {
    if (!commActive) {
        if (recognition) {
            commActive = true;
            startCommBtn.innerText = "DEACTIVATE COMM";
            commStatus.innerText = "COMM ACTIVE // SAY 'AVA'";
            commStatus.classList.add('highlight');
            visualizer.classList.add('active');

            speak("Voice comm active. Say Ava followed by your command.", () => {
                try { recognition.start(); } catch(e) {}
            });
        } else {
            alert("Speech recognition is not supported in your browser.");
        }
    } else {
        commActive = false;
        if (recognition) {
            try { recognition.stop(); } catch(e) {}
        }
        commStatus.innerText = "STANDBY";
        commStatus.classList.remove('highlight');
        startCommBtn.innerText = "ACTIVATE VOICE COMM";
        visualizer.classList.remove('active');
    }
});

manualCmdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && manualCmdInput.value.trim() !== "") {
        processAvaCommand(manualCmdInput.value);
        manualCmdInput.value = "";
    }
});

async function processAvaCommand(text) {
    const command = text.toLowerCase();
    commStatus.innerText = `PROCESSING...`;
    commStatus.classList.add('highlight');

    // 1. Window Quadrant Grid / Main Master Display Commands
    if (command.includes("move") || command.includes("snap") || command.includes("put")) {
        let targetWin = null;
        if (command.includes("browser")) targetWin = document.getElementById('browser-window');
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
        browserWindow.style.display = 'none';
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
        document.getElementById('media-window').style.display = 'none';
        commStatus.innerText = "MEDIA UPLINK CLOSED.";
        speak("Closing visual uplink.");
        return;
    }

    // 4. Fallback if no LLM configured
    if (!LLM_ENDPOINT) {
        commStatus.innerText = "LOCAL COMMAND EXECUTED";
        speak("Command executed locally.");
        return;
    }

    // 5. Send to Local LLM / Ollama
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (LLM_API_KEY) headers['Authorization'] = `Bearer ${LLM_API_KEY}`;

        const response = await fetch(LLM_ENDPOINT, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: LLM_MODEL || 'llama3',
                messages: [
                    { role: "system", content: "You are A.V.A., an advanced virtual assistant inspired by J.A.R.V.I.S. from Iron Man. Keep your responses concise (under 2 sentences), sharp, and helpful." },
                    { role: "user", content: text }
                ],
                stream: false
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]?.message?.content) {
            const aiReply = data.choices[0].message.content.trim();
            commStatus.innerText = aiReply.toUpperCase();
            speak(aiReply);
        } else {
            console.error("Local LLM response error:", data);
            commStatus.innerText = "LOCAL LLM ERROR";
            speak("Mainframe communication error.");
        }
    } catch (err) {
        console.error("Local LLM connection error:", err);
        commStatus.innerText = "OFFLINE MODE";
        speak("Local server unreachable.");
    }
}

async function fetchMedia(query) {
    const mediaWindow = document.getElementById('media-window');
    const imageGrid = document.getElementById('media-images');
    const videoSlot = document.getElementById('media-video');

    mediaWindow.style.display = 'flex';
    imageGrid.innerHTML = 'SCANNING ARCHIVES...';
    videoSlot.innerHTML = 'ESTABLISHING VIDEO FEED...';

    try {
        const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&prop=pageimages&pithumbsize=400&format=json&origin=*`);
        const wikiData = await wikiRes.json();

        let imgHtml = '';
        if (wikiData.query && wikiData.query.pages) {
            const pages = Object.values(wikiData.query.pages);
            const images = pages.filter(p => p.thumbnail).slice(0, 4);
            if (images.length > 0) {
                images.forEach(img => {
                    imgHtml += `<img src="${img.thumbnail.source}" alt="${img.title}" style="width: 100%; height: 100%; object-fit: cover; border: 1px solid var(--hud-cyan); border-radius: 3px;">`;
                });
            } else {
                imgHtml = 'NO VISUALS FOUND IN WIKIPEDIA ARCHIVES.';
            }
        } else {
            imgHtml = 'NO VISUALS FOUND IN WIKIPEDIA ARCHIVES.';
        }

        imageGrid.innerHTML = imgHtml;
        imageGrid.style.display = 'grid';
        imageGrid.style.gridTemplateColumns = '1fr 1fr';
        imageGrid.style.gap = '10px';

        const dmRes = `https://api.dailymotion.com/videos?search=${encodeURIComponent(query)}&limit=1&fields=id,title`;
        const dmFetch = await fetch(dmRes);
        const dmData = await dmFetch.json();

        if (dmData.list && dmData.list.length > 0) {
            const videoId = dmData.list[0].id;
            videoSlot.innerHTML = `<iframe frameborder="0" width="100%" height="200" src="https://www.dailymotion.com/embed/video/${videoId}?autoplay=1&mute=1" allowfullscreen allow="autoplay"></iframe>`;
        } else {
            videoSlot.innerHTML = 'NO VIDEO FEED AVAILABLE FOR THIS TARGET.';
        }

    } catch (err) {
        console.error(err);
        imageGrid.innerHTML = 'UPLINK ERROR. CONNECTION SEVERED.';
        videoSlot.innerHTML = 'UPLINK ERROR.';
    }
}
