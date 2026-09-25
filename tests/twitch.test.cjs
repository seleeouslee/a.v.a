const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup(protocol = 'https:', hostname = 'seleeouslee.github.io') {
    const elements = new Map();
    function element(id) {
        if (!elements.has(id)) elements.set(id, {
            id, value: '', src: 'about:blank', hidden: true, style: {}, events: {},
            classList: { add() {}, remove() {} }, focus() {},
            addEventListener(name, handler) { this.events[name] = handler; }
        });
        return elements.get(id);
    }
    const context = vm.createContext({
        URLSearchParams, console, setTimeout() {},
        document: { getElementById: element },
        window: { location: { protocol, hostname }, SpeechRecognition: class {} },
        highestZIndex: 11,
        handleTransitCommand: () => false,
        moveWindowToQuadrant(target, position) { target.position = position; },
        requestAiReply() { throw new Error('Twitch command fell through to the model'); }
    });
    for (const file of ['repeat.js', 'twitch.js', 'commands.js', 'voice.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context);
    }
    const run = code => vm.runInContext(code, context);
    return { element, run };
}

test('typed wake word and browser alias load stream and chat for the Pages domain', async () => {
    const { element, run } = setup();
    await run("processAvaCommand('Ava, open browser Twitch channel TwitchDev')");
    const player = new URL(element('twitch-player').src);
    const chat = new URL(element('twitch-chat').src);
    assert.equal(player.hostname, 'player.twitch.tv');
    assert.equal(player.searchParams.get('channel'), 'twitchdev');
    assert.equal(player.searchParams.get('parent'), 'seleeouslee.github.io');
    assert.equal(player.searchParams.get('autoplay'), 'false');
    assert.equal(chat.pathname, '/embed/twitchdev/chat');
    assert.equal(chat.searchParams.get('parent'), 'seleeouslee.github.io');
    assert.equal(element('twitch-window').style.display, 'flex');
    assert.equal(element('twitch-streams').hidden, false);
});

test('Enter and Send route typed Twitch commands without activating voice', async () => {
    const { element, run } = setup();
    element('manual-command-input').value = 'ava open twitch';
    let prevented = false;
    await element('manual-command-input').events.keydown({ key: 'Enter', preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(element('twitch-window').style.display, 'flex');
    assert.equal(element('manual-command-input').value, '');
    assert.match(element('comm-status').innerText, /Enter a Twitch channel/);
    assert.equal(run('commActive'), false);

    element('manual-command-input').value = 'AVA, open Twitch twitchdev.';
    await element('send-command-btn').events.click();
    assert.equal(new URL(element('twitch-player').src).searchParams.get('channel'), 'twitchdev');
});

test('speech recognition can open Twitch with trailing punctuation', () => {
    const { element, run } = setup();
    run(`recognition.onresult({resultIndex:0,results:[Object.assign([{transcript:'Ava, open Twitch.'}],{isFinal:true})]})`);
    assert.equal(element('twitch-window').style.display, 'flex');
    assert.match(element('comm-status').innerText, /Enter a Twitch channel/);
});

test('Enter ignores composition and held keys; routing errors are shown', async () => {
    const { element, run } = setup();
    const input = element('manual-command-input');
    input.value = 'ava open twitch';
    for (const flags of [{ isComposing: true }, { repeat: true }]) {
        await input.events.keydown({ key: 'Enter', ...flags, preventDefault() { assert.fail('Should ignore this key'); } });
        assert.equal(input.value, 'ava open twitch');
    }
    run('processAvaCommand = async () => { throw new Error("Test command failure"); }');
    await element('send-command-btn').events.click();
    assert.match(element('comm-status').innerText, /COMMAND FAILED/);
});

test('channel switching via form, positioning and close unload both embeds', async () => {
    const { element, run } = setup('http:', 'localhost');
    await run("processAvaCommand('open Twitch')");
    assert.equal(element('twitch-player').src, 'about:blank');
    element('twitch-channel-input').value = 'https://www.twitch.tv/monstercat/';
    element('twitch-channel-form').events.submit({ preventDefault() {} });
    assert.equal(new URL(element('twitch-player').src).searchParams.get('channel'), 'monstercat');
    assert.equal(new URL(element('twitch-player').src).searchParams.get('parent'), 'localhost');
    await run("processAvaCommand('move Twitch top left')");
    assert.equal(element('twitch-window').position, 'top left');
    await run("processAvaCommand('close Twitch')");
    assert.equal(element('twitch-player').src, 'about:blank');
    assert.equal(element('twitch-chat').src, 'about:blank');
    assert.equal(element('twitch-window').style.display, 'none');
    await run("processAvaCommand('open Twitch twitchdev')");
    element('twitch-close-btn').events.click();
    assert.equal(element('twitch-player').src, 'about:blank');
});

test('invalid channels cannot alter embed destinations; file URLs show guidance', () => {
    const { element, run } = setup();
    run("openTwitch('https://evil.example/channel')");
    assert.equal(element('twitch-player').src, 'about:blank');
    assert.match(element('twitch-status').textContent, /Enter a channel/);
    const local = setup('file:', '');
    local.run("openTwitch('twitchdev')");
    assert.equal(local.element('twitch-player').src, 'about:blank');
    assert.match(local.element('twitch-status').textContent, /localhost/);
});

test('spoken wake word removal preserves ava inside channel names', () => {
    const { element, run } = setup();
    run(`recognition.onresult({resultIndex:0,results:[Object.assign([{transcript:'Ava, open Twitch channel lavastream.'}],{isFinal:true})]})`);
    assert.equal(new URL(element('twitch-player').src).searchParams.get('channel'), 'lavastream');
    run(`recognition.onresult({resultIndex:0,results:[Object.assign([{transcript:'open Twitch avatar'}],{isFinal:true})]})`);
    assert.equal(new URL(element('twitch-player').src).searchParams.get('channel'), 'lavastream');
});

test('AVA and EVA aliases route typed and spoken commands without matching parts of words', async () => {
    for (const alias of ['AVA', 'EVA', 'A.V.A.', 'E.V.A.']) {
        const { element, run } = setup();
        await run(`processAvaCommand('${alias}, open Twitch channel twitchdev')`);
        assert.equal(new URL(element('twitch-player').src).searchParams.get('channel'), 'twitchdev');
        run(`recognition.onresult({resultIndex:0,results:[Object.assign([{transcript:'${alias}, open Twitch channel evastream'}],{isFinal:true})]})`);
        assert.equal(new URL(element('twitch-player').src).searchParams.get('channel'), 'evastream');
        run(`recognition.onresult({resultIndex:0,results:[Object.assign([{transcript:'open Twitch evaluate'}],{isFinal:true})]})`);
        assert.equal(new URL(element('twitch-player').src).searchParams.get('channel'), 'evastream');
    }
});
