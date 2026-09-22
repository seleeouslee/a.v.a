// Pure STM command parsing and published-schedule calculations (no network or UI).
const STM_TIMEZONE = 'America/Montreal';

function normalizeTransit(text) {
    return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function parseTransitCommand(text) {
    const clean = normalizeTransit(text);
    if (!/\b(stm|bus|metro)\b/.test(clean) || !/\b(next|when|schedule|schedules|frequency|timetable|open|show)\b/.test(clean)) return null;
    const mode = /\bmetro\b/.test(clean) ? 'metro' : 'bus';
    const tail = clean.split(new RegExp(`\\b${mode}\\b`))[1] || '';
    const directionMatch = tail.match(/\b(?:towards?|heading|direction|bound for)\s+(.+)$/);
    const direction = directionMatch ? directionMatch[1] : '';
    const location = directionMatch ? tail.slice(0, directionMatch.index).trim() : tail;
    if (mode === 'bus') {
        const route = location.match(/^\s*(?:route\s+)?(\d{1,3})\b/);
        const stop = location.match(/\b(?:stop|arret)\s+(\d{5})\b/) || location.match(/\bat\s+(\d{5})\b/);
        return { mode, route: route?.[1] || '', stop: stop?.[1] || '', direction };
    }
    const station = location.match(/\b(?:at|from|station)\s+(?:station\s+)?(.+)$/);
    const line = location.match(/\b(green|verte|orange|yellow|jaune|blue|bleue)\b/) || location.match(/\bline\s+([1245])\b/);
    return { mode, route: line?.[1] || '', stop: station?.[1] || '', direction };
}

function stmLocalDate(now) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone: STM_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(now).map(p => [p.type, p.value]));
    return parts.year + parts.month + parts.day;
}

function stmDateOffset(date, days) {
    const value = new Date(Date.UTC(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8) + days));
    return value.toISOString().slice(0, 10).replaceAll('-', '');
}

function stmServiceStart(date) {
    // GTFS counts seconds from local noon minus 12 hours, including DST changes.
    const noonUtc = Date.UTC(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8), 12);
    const hour = Number(new Intl.DateTimeFormat('en-US', {
        timeZone: STM_TIMEZONE, hour: '2-digit', hourCycle: 'h23'
    }).format(new Date(noonUtc)));
    return noonUtc + (12 - hour) * 3600000 - 12 * 3600000;
}

function stmServiceActive(index, serviceId, date) {
    const exception = index.exceptions[date]?.[serviceId];
    if (exception) return exception === 1;
    const service = index.services[serviceId];
    if (!service || date < service.start_date || date > service.end_date) return false;
    const day = new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T12:00:00Z`).getUTCDay();
    return service[['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][day]] === '1';
}

function stmNextDepartures(index, groups, directions, now = new Date()) {
    const date = stmLocalDate(now);
    if (date < index.start || date > index.end) throw new Error('The bundled STM schedule is out of date. Refresh the schedule data before using arrival times.');
    const results = [];
    for (let offset = -2; offset <= 1; offset++) {
        const serviceDate = stmDateOffset(date, offset);
        if (serviceDate < index.start || serviceDate > index.end) continue;
        const start = stmServiceStart(serviceDate);
        for (const [service, direction, times] of groups) {
            if (!directions.includes(direction) || !stmServiceActive(index, service, serviceDate)) continue;
            for (const seconds of times) {
                const time = start + seconds * 1000;
                if (time >= now.getTime() && time <= now.getTime() + 86400000) results.push({ time, direction });
            }
        }
    }
    return results.sort((a, b) => a.time - b.time)
        .filter((r, i, all) => i === 0 || r.time !== all[i - 1].time || r.direction !== all[i - 1].direction).slice(0, 3);
}

function resolveTransitStop(index, query) {
    const aliases = { green: '1', verte: '1', orange: '2', yellow: '4', jaune: '4', blue: '5', bleue: '5' };
    const routeNumber = aliases[normalizeTransit(query.route)] || query.route;
    const stopQuery = normalizeTransit(query.stop).replace(/^station /, '');
    if (!stopQuery || (query.mode === 'bus' && !routeNumber)) {
        throw new Error(query.mode === 'bus'
            ? 'Specify a bus route and five-digit stop code, for example: next bus 24 at stop 52819.'
            : 'Specify a station and direction, for example: next metro at Berri-UQAM toward Angrignon.');
    }
    const candidates = [];
    for (const route of index.routes.filter(r => r.mode === query.mode && (!routeNumber || r.number === routeNumber))) {
        for (const stop of route.stops) {
            const name = normalizeTransit(stop.name).replace(/^station /, '');
            const exact = stop.code === query.stop || stop.id === query.stop || name === stopQuery;
            if (!exact && (query.mode === 'bus' || stopQuery.length < 2 || !name.includes(stopQuery))) continue;
            const directionQuery = normalizeTransit(query.direction).replace(/^station /, '');
            const directions = stop.directions.filter(id => {
                const d = route.directions[id];
                return !directionQuery || normalizeTransit(d.name).includes(directionQuery) || d.compass === directionQuery;
            });
            if (directions.length) candidates.push({ route, stop, directions, exact });
        }
    }
    const matches = candidates.some(c => c.exact) ? candidates.filter(c => c.exact) : candidates;
    if (!matches.length) throw new Error('No matching STM route, stop, and direction. Check the stop code or station name and destination.');
    if (matches.length > 1) throw new Error('Please specify the line and station more precisely: ' + matches.slice(0, 5).map(c => `${c.route.number}: ${c.stop.name}`).join('; '));
    const match = matches[0];
    if (query.mode === 'metro' && match.directions.length > 1) {
        throw new Error('Specify a direction: ' + match.directions.map(id => match.route.directions[id].name).join(' or '));
    }
    return match;
}
