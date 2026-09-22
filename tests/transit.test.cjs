const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const root = path.join(__dirname, '..');
const context = vm.createContext({ Intl, Date });
vm.runInContext(fs.readFileSync(path.join(root, 'js/transit-schedule.js'), 'utf8'), context);
const index = JSON.parse(fs.readFileSync(path.join(root, 'data/stm/index.json'), 'utf8'));

test('parses bus stop and metro station with route and direction', () => {
    const bus = context.parseTransitCommand("what's the next STM bus 24 at stop 52819 toward west?");
    assert.deepEqual(JSON.parse(JSON.stringify(bus)), { mode: 'bus', route: '24', stop: '52819', direction: 'west' });
    const metro = context.parseTransitCommand('next STM metro green line at Berri-UQAM toward Angrignon');
    assert.equal(metro.route, 'green');
    assert.equal(metro.stop, 'berri uqam');
    assert.equal(metro.direction, 'angrignon');
    assert.equal(context.parseTransitCommand('open Twitch channel twitchdev'), null);
    assert.equal(context.parseTransitCommand('move STM top left'), null);
});

test('resolves real STM bus stops and metro directions, rejects ambiguous or missing locations', () => {
    const bus = context.resolveTransitStop(index, {mode:'bus', route:'24', stop:'52819', direction:'west'});
    assert.equal(bus.stop.name, 'Montgomery / Sherbrooke');
    assert.ok(bus.directions.length > 0);
    const metro = context.resolveTransitStop(index, {mode:'metro', route:'', stop:'Berri-UQAM', direction:'Angrignon'});
    assert.equal(metro.route.number, '1');
    assert.throws(() => context.resolveTransitStop(index, {mode:'metro', route:'', stop:'Berri-UQAM', direction:''}), /specify/i);
    assert.throws(() => context.resolveTransitStop(index, {mode:'bus', route:'24', stop:'99999', direction:''}), /No matching/);
    assert.throws(() => context.resolveTransitStop(index, {mode:'bus', route:'24', stop:'', direction:''}), /five-digit/);
});

test('service calendars honor added and removed holiday exceptions', () => {
    const sample = { services:[{start_date:'20260901',end_date:'20260930',monday:'1',tuesday:'1'}], exceptions:{'20260907':{0:2},'20260906':{0:1}} };
    assert.equal(context.stmServiceActive(sample, 0, '20260907'), false);
    assert.equal(context.stmServiceActive(sample, 0, '20260906'), true);
    assert.equal(context.stmServiceActive(sample, 0, '20260908'), true);
    assert.equal(context.stmServiceActive(sample, 0, '20261005'), false);
});

test('overnight departures use the previous service day and Montreal time', () => {
    const sample = { start:'20260901',end:'20260930', services:[{start_date:'20260901',end_date:'20260930',monday:'1'}], exceptions:{} };
    // Monday 25:10 is Tuesday 01:10 local, which is 05:10 UTC in September.
    const departures = context.stmNextDepartures(sample, [[0,0,[25*3600+600]]], [0], new Date('2026-09-22T05:00:00Z'));
    assert.equal(departures.length, 1);
    assert.equal(new Date(departures[0].time).toISOString(), '2026-09-22T05:10:00.000Z');
    assert.equal(context.stmLocalDate(new Date('2026-09-22T02:00:00Z')), '20260921');
    assert.equal(context.stmNextDepartures(sample, [[0,0,[25*3600+600]]], [1], new Date('2026-09-22T05:00:00Z')).length, 0);
    assert.throws(() => context.stmNextDepartures(sample, [], [], new Date('2026-10-01T12:00:00Z')), /out of date/);
});

test('GTFS service-day anchor follows daylight saving changes', () => {
    assert.equal(new Date(context.stmServiceStart('20261101')).toISOString(), '2026-11-01T05:00:00.000Z');
    assert.equal(new Date(context.stmServiceStart('20260308')).toISOString(), '2026-03-08T04:00:00.000Z');
});

test('bundled bus schedules decompress and contain next departures; metro exports contain no trip times', () => {
    const { route, stop, directions } = context.resolveTransitStop(index, {mode:'bus',route:'24',stop:'52819',direction:'west'});
    const data = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root, 'data/stm', route.file))));
    const departures = context.stmNextDepartures(index, data[stop.id], directions, new Date('2026-09-22T16:00:00Z'));
    assert.equal(departures.length, 3);
    assert.ok(departures.every(d => d.time >= Date.parse('2026-09-22T16:00:00Z')));
    for (const r of index.routes) {
        if (r.mode === 'bus') assert.ok(fs.existsSync(path.join(root, 'data/stm', r.file)));
        else assert.equal(r.file, undefined);
    }
});

test('transit questions are handled before the model or media search', async () => {
    let received;
    const app = vm.createContext({
        commStatus:{classList:{add(){}}},
        checkRepeatCommand() { return false; },
        handleTransitCommand(text) { received=text; return Promise.resolve(true); },
        requestAiReply() { throw Error('Must not invent a schedule'); }
    });
    vm.runInContext(fs.readFileSync(path.join(root, 'js/commands.js'), 'utf8'), app);
    await app.processAvaCommand('Eva, show me the next STM bus 24 at stop 52819');
    assert.equal(received, 'show me the next STM bus 24 at stop 52819');
});

test('panel loads route gzip over HTTP, speaks scheduled bus times, and reports metro frequencies', async () => {
    const http = require('node:http');
    const server = http.createServer((req, res) => {
        // Only serve generated STM files, under a project path like GitHub Pages.
        const file = req.url.replace(/^\/a\.v\.a\/data\/stm\//, '');
        if (!/^[\w.-]+$/.test(file)) { res.writeHead(404).end(); return; }
        const target = path.join(root, 'data/stm', file);
        if (!fs.existsSync(target)) { res.writeHead(404).end(); return; }
        res.end(fs.readFileSync(target));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        const elements = new Map();
        const element = id => {
            if (!elements.has(id)) elements.set(id, {value:'',style:{},events:{},classList:{add(){}},addEventListener(name, fn){this.events[name]=fn;}});
            return elements.get(id);
        };
        let spoken = '';
        const app = vm.createContext({
            Intl, Date: class extends Date { constructor(...args) { super(...(args.length ? args : ['2026-09-22T16:00:00Z'])); } },
            Map, Blob, Response, TextDecoder, Uint8Array, DecompressionStream, AbortSignal,
            window:{location:{protocol:'http:'}}, document:{getElementById:element}, highestZIndex:11,
            commStatus:element('comm-status'), speak(text){spoken=text;},
            fetch(url, opts) {return fetch(`http://127.0.0.1:${server.address().port}/a.v.a/${url.replace(/^\.\//,'')}`, opts);}
        });
        for (const file of ['transit-schedule.js','transit.js']) vm.runInContext(fs.readFileSync(path.join(root,'js',file),'utf8'),app);
        await app.handleTransitCommand('next bus 24 at stop 52819 toward west');
        assert.match(spoken, /next scheduled departures/);
        assert.match(element('transit-result').textContent, /Montgomery/);
        assert.equal(element('transit-window').style.display, 'flex');
        await app.handleTransitCommand('next metro at Berri-UQAM toward Angrignon');
        assert.match(spoken, /published metro frequency/);
        assert.match(spoken, /not a next-train countdown/);
        assert.match(element('transit-result').textContent, /3 to 5/);
        await app.handleTransitCommand('next bus 24');
        assert.match(spoken, /five-digit stop code/);
        app.handleTransitCommand('close STM');
        assert.equal(element('transit-window').style.display, 'none');
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});
