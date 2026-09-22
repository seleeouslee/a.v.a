// STM panel, static-data loading and spoken answers. Uses transit-schedule.js and voice.js.
const transitWindow = document.getElementById('transit-window');
const transitMode = document.getElementById('transit-mode');
const transitRoute = document.getElementById('transit-route');
const transitStop = document.getElementById('transit-stop');
const transitDirection = document.getElementById('transit-direction');
const transitResult = document.getElementById('transit-result');
const transitSource = document.getElementById('transit-source');
const transitCache = new Map();
let transitRequestId = 0;

async function loadTransitData(filename) {
    if (!transitCache.has(filename)) {
        const promise = (async () => {
            const response = await fetch(`./data/stm/${filename}`, { cache: 'no-cache', signal: AbortSignal.timeout(15000) });
            if (!response.ok) throw new Error(`STM schedule file could not be loaded (${response.status}).`);
            if (!filename.endsWith('.gz')) return response.json();
            const bytes = new Uint8Array(await response.arrayBuffer());
            // Some servers decompress .gz themselves; handle either response.
            if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return JSON.parse(new TextDecoder().decode(bytes));
            if (typeof DecompressionStream === 'undefined') throw new Error('Use a current browser to read the compressed STM schedules.');
            const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
            return new Response(stream).json();
        })().catch(error => { transitCache.delete(filename); throw error; });
        transitCache.set(filename, promise);
    }
    return transitCache.get(filename);
}

function showTransitPanel() {
    transitWindow.style.display = 'flex';
    transitWindow.style.zIndex = ++highestZIndex;
}

function closeTransit() {
    transitRequestId++;
    transitWindow.style.display = 'none';
}

async function lookupTransit(query) {
    const requestId = ++transitRequestId;
    showTransitPanel();
    transitMode.value = query.mode;
    transitRoute.value = query.route;
    transitStop.value = query.stop;
    transitDirection.value = query.direction;
    transitResult.textContent = 'Checking published STM schedules…';
    transitSource.href = 'https://www.stm.info/fr/a-propos/developpeurs';
    let reply;
    try {
        if (window.location.protocol === 'file:') throw new Error('Use the GitHub Pages site or a local HTTP server to load STM schedules.');
        const index = await loadTransitData('index.json');
        if (requestId !== transitRequestId) return;
        const now = new Date();
        const date = stmLocalDate(now);
        if (date < index.start || date > index.end) throw new Error('The bundled STM schedule has expired or is not active yet. Refresh the schedule data.');
        const { route, stop, directions } = resolveTransitStop(index, query);
        transitSource.href = stop.url || route.url || transitSource.href;
        if (query.mode === 'bus') {
            const timetable = await loadTransitData(route.file);
            if (requestId !== transitRequestId) return;
            // Recalculate the time after download so elapsed departures are excluded.
            const departures = stmNextDepartures(index, timetable[stop.id] || [], directions, new Date());
            if (!departures.length) {
                reply = `No published departures found for bus ${route.number} at ${stop.name} in the next 24 hours within this schedule's coverage.`;
            } else {
                const clock = new Intl.DateTimeFormat('en-CA', { timeZone: STM_TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
                const lines = departures.map(d => `${clock.format(d.time)} toward ${route.directions[d.direction].name}`);
                reply = `Bus ${route.number} at stop ${stop.code}: next scheduled departures ${lines.join('; ')}. These are published times, not live arrivals.`;
            }
            transitResult.textContent = `${stop.name}\n${reply}\nAll times Montréal time. Schedule valid through ${index.end.slice(0, 4)}-${index.end.slice(4, 6)}-${index.end.slice(6, 8)}.`;
        } else {
            const metro = await loadTransitData('metro-frequencies.json');
            if (requestId !== transitRequestId) return;
            const line = metro.lines[route.id];
            if (!line || date > metro.reviewBy.replaceAll('-', '')) throw new Error('Metro frequency information needs refreshing. Consult STM for current service.');
            // Report all typical periods: frequencies do not establish that trains are running now.
            const range = values => values[0] === values[1] ? String(values[0]) : `${values[0]} to ${values[1]}`;
            reply = `At ${stop.name} toward ${route.directions[directions[0]].name}, published metro frequency is ${range(line.peak)} minutes at weekday peak times, ${range(line.offpeak)} off peak, and ${range(line.weekend)} on weekends. This is not a next-train countdown.`;
            transitResult.textContent = `${route.name}\n${reply}\nPeak: weekdays 07:00–09:00 and 16:00–18:00. These ranges apply during service hours; check STM for first/last trains, holidays and disruptions. Checked ${metro.checked}.`;
            transitSource.href = stop.url || line.source;
        }
    } catch (error) {
        if (requestId !== transitRequestId) return;
        reply = error.name === 'TimeoutError' ? 'The STM schedule download timed out. Please try again.' : error.message;
        transitResult.textContent = reply;
    }
    if (requestId === transitRequestId) {
        commStatus.innerText = reply;
        speak(reply);
    }
}

function handleTransitCommand(text) {
    if (/^(?:close|hide)\s+(?:stm|transit)(?:\s+panel)?[.!]?$/i.test(text)) {
        closeTransit();
        commStatus.innerText = 'STM PANEL CLOSED';
        speak('STM panel closed.');
        return true;
    }
    const query = parseTransitCommand(text);
    if (!query) return false;
    return lookupTransit(query).then(() => true);
}

document.getElementById('transit-form').addEventListener('submit', event => {
    event.preventDefault();
    lookupTransit({ mode: transitMode.value, route: transitRoute.value.trim(), stop: transitStop.value.trim(), direction: transitDirection.value.trim() });
});
document.getElementById('transit-close-btn').addEventListener('click', closeTransit);
