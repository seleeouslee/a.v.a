const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
    const status = { innerText: '' };
    const spoken = [];
    const context = vm.createContext({
        document: { getElementById() { return status; } },
        speak(text) { spoken.push(text); },
        String
    });
    vm.runInContext(fs.readFileSync('js/repeat.js', 'utf8'), context);
    return { context, status, spoken };
}

test('repeat replays the last response with punctuation and aliases', () => {
    const { context, status, spoken } = setup();
    context.recordAvaMemory('Browser uplink established.');
    for (const command of ['repeat', 'repeat.', 'repeat that', 'repeat last?', 'repeat it', 'say that again']) {
        assert.equal(context.checkRepeatCommand(command), true);
        assert.equal(spoken.at(-1), 'Browser uplink established.');
        assert.equal(status.innerText, 'REPLAYING MEMORY...');
    }
});

test('empty memory reports a useful status without creating a repeat loop', () => {
    const { context, status, spoken } = setup();
    assert.equal(context.checkRepeatCommand('repeat'), true);
    assert.equal(status.innerText, 'MEMORY EMPTY');
    assert.deepEqual([...spoken], ['I have no previous transmissions in memory.']);
    assert.equal(context.checkRepeatCommand('repeat'), true);
    assert.deepEqual([...spoken], [
        'I have no previous transmissions in memory.',
        'I have no previous transmissions in memory.'
    ]);
});
