const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup(fetch) {
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) {
            let content = '';
            elements.set(id, {
                id, style: {}, events: {}, value: '', src: 'about:blank',
                classList: { add() {} }, focus() {}, setAttribute() {},
                addEventListener(type, handler) { this.events[type] = handler; },
                appendChild(child) { this.closeButton = child; },
                querySelector() { return element(id + '-header'); },
                get innerHTML() { return content; }, set innerHTML(value) { content = value; },
                get textContent() { return content; }, set textContent(value) { content = value; }
            });
        }
        return elements.get(id);
    };
    const panels = ['youtube-window', 'twitch-window', 'media-window', 'browser-window'].map(element);
    const context = vm.createContext({
        document: { getElementById: element, querySelectorAll: () => panels, createElement: () => element('button-' + elements.size) },
        window: { location: { protocol: 'https:', hostname: 'localhost' } },
        console, URLSearchParams, fetch, highestZIndex: 11,
        commStatus: element('comm-status'), speak() {}, checkRepeatCommand: () => false, handleTransitCommand: () => false
    });
    for (const file of ['browser.js', 'media.js', 'twitch.js', 'youtube.js', 'commands.js', 'panels.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context);
    }
    return { element, run: code => vm.runInContext(code, context) };
}

test('header and command close actions unload all embedded video panels', async () => {
    for (const viaHeader of [true, false]) {
        const { element, run } = setup();
        for (const [name, open, player] of [
            ['youtube', "openYouTube('abcdefghijk')", 'youtube-player'],
            ['twitch', "openTwitch('twitchdev')", 'twitch-player'],
            ['browser', "navigateBrowser('https://example.com/video')", 'browser-iframe']
        ]) {
            run(open);
            assert.notEqual(element(player).src, 'about:blank');
            if (viaHeader) element(name + '-window-header').closeButton.events.click();
            else await run(`processAvaCommand('close ${name}')`);
            assert.equal(element(player).src, 'about:blank');
            assert.equal(element(name + '-window').style.display, 'none');
        }
        assert.equal(element('twitch-chat').src, 'about:blank');
        element('media-video').innerHTML = '<iframe src="https://example.com/video"></iframe>';
        if (viaHeader) element('media-window-header').closeButton.events.click();
        else await run("processAvaCommand('close media')");
        assert.equal(element('media-window').style.display, 'none');
        assert.doesNotMatch(element('media-video').innerHTML, /iframe/);
    }
});

test('closing media during a video search prevents hidden autoplay when it completes', async () => {
    let finishVideo;
    let videoStarted;
    const started = new Promise(resolve => { videoStarted = resolve; });
    const { element, run } = setup(async url => {
        if (url.includes('wikipedia')) return { json: async () => ({}) };
        return { json: () => new Promise(resolve => {
            finishVideo = resolve;
            videoStarted();
        }) };
    });
    const pending = run("fetchMedia('space')");
    await started;
    element('media-window-header').closeButton.events.click();
    finishVideo({ list: [{ id: 'video123' }] });
    await pending;
    assert.equal(element('media-window').style.display, 'none');
    assert.equal(element('media-video').textContent, 'AWAITING QUERY...');
});
