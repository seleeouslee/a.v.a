const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup() {
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, {
            value: '', style: {}, events: {}, classList: { add() {}, remove() {} },
            focus() {}, addEventListener(type, fn) { this.events[type] = fn; }
        });
        return elements.get(id);
    };
    const spoken = [];
    let mic;
    class Recognition {
        constructor() { mic = this; this.starts = 0; this.stops = 0; }
        start() { this.starts++; }
        stop() { this.stops++; }
    }
    const context = vm.createContext({
        console, URLSearchParams,
        document: { getElementById: element },
        window: { location: { protocol: 'https:', hostname: 'localhost' }, SpeechRecognition: Recognition,
            speechSynthesis: { cancel() {}, getVoices: () => [], speak: u => spoken.push(u) } },
        SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
        highestZIndex: 11, handleTransitCommand: () => false,
        requestAiReply() { throw new Error('Unexpected model request'); }
    });
    for (const file of ['repeat.js', 'twitch.js', 'commands.js', 'voice.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context);
    }
    const result = (texts, resultIndex = 0) => mic.onresult({ resultIndex,
        results: texts.map(transcript => Object.assign([{ transcript }], { isFinal: true })) });
    return { element, spoken, mic, result, run: code => vm.runInContext(code, context) };
}

test('activating voice starts the microphone immediately without waiting for speech', () => {
    const { element, spoken, mic, result } = setup();
    element('start-comm-btn').events.click();
    assert.equal(mic.starts, 1);
    assert.equal(spoken.length, 0);
    mic.onstart();
    result(['Ava, open Twitch.']);
    assert.equal(element('twitch-window').style.display, 'flex');
    assert.match(spoken[0].text, /Enter a Twitch channel/);
});

test('wake word survives split results and a pause before the command', () => {
    for (const splitSession of [false, true]) {
        const { element, result, spoken } = setup();
        if (splitSession) {
            result(['Ava.']);
            assert.equal(spoken.length, 0);
            result(['Open Twitch.']);
        } else {
            result(['Ava', 'open Twitch.'], 1);
        }
        assert.equal(element('twitch-window').style.display, 'flex');
    }
});

test('microphone resumes after speech ends or fails without listening during reply', () => {
    for (const completion of ['onend', 'onerror']) {
        const { element, result, spoken, mic } = setup();
        element('start-comm-btn').events.click();
        mic.onstart();
        result(['Ava open Twitch']);
        mic.onend();
        assert.equal(mic.starts, 1);
        spoken[0][completion]();
        assert.equal(mic.starts, 2);
    }
});

test('permission and network errors stay visible and stop automatic retries', () => {
    for (const error of ['not-allowed', 'audio-capture', 'network']) {
        const { element, mic, run } = setup();
        element('start-comm-btn').events.click();
        mic.onerror({ error });
        const status = element('comm-status').innerText;
        mic.onend();
        assert.equal(mic.starts, 1);
        assert.equal(run('commActive'), false);
        assert.equal(element('comm-status').innerText, status);
        assert.equal(element('start-comm-btn').innerText, 'ACTIVATE VOICE COMM');
    }
});

test('deactivation during a reply prevents a delayed microphone restart', () => {
    const { element, result, spoken, mic } = setup();
    element('start-comm-btn').events.click();
    mic.onstart();
    result(['Ava open Twitch']);
    element('start-comm-btn').events.click();
    mic.onend();
    spoken[0].onend();
    assert.equal(mic.starts, 1);
});
