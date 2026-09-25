const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '../js/features.js'), 'utf8');

function setup() {
    const elements = new Map();
    let focused;
    for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) {
        assert.ok(!elements.has(id), `Duplicate ID: ${id}`);
        elements.set(id, {
            style: {}, value: '', open: false,
            addEventListener(type, handler) { this[type] = handler; },
            focus() { focused = id; },
            getBoundingClientRect() { return { left: -500, top: 900, width: 320, height: 350 }; },
            showModal() { this.open = true; },
            close() { this.open = false; }
        });
    }
    const cards = [...html.matchAll(/data-panel="([^"]+)"(?: data-focus="([^"]+)")?/g)].map(([, panel, focus]) => ({
        dataset: { panel, focus },
        addEventListener(type, handler) { this[type] = handler; }
    }));
    elements.get('features-dialog').querySelectorAll = () => cards;
    const searches = [], repeats = [];
    const context = vm.createContext({
        document: { getElementById: id => elements.get(id) },
        window: { innerWidth: 1024, innerHeight: 768 },
        highestZIndex: 11,
        fetchMedia: query => searches.push(query),
        checkRepeatCommand: command => repeats.push(command)
    });
    vm.runInContext(source, context);
    return { elements, cards, searches, repeats, focus: () => focused };
}

test('feature menu opens, closes, and launches every panel with focus and visible placement', () => {
    const { elements, cards, focus } = setup();
    const dialog = elements.get('features-dialog');
    const launch = elements.get('features-open-btn');
    launch.click();
    assert.equal(dialog.open, true);
    elements.get('features-close-btn').click();
    assert.equal(dialog.open, false);
    assert.equal(cards.length, 8);
    let lastZ = 999;
    for (const card of cards) {
        launch.click();
        card.click();
        const panel = elements.get(card.dataset.panel);
        assert.equal(dialog.open, false);
        assert.equal(panel.style.display, 'flex');
        assert.ok(panel.style.zIndex > lastZ);
        lastZ = panel.style.zIndex;
        assert.equal(panel.style.left, '0px');
        assert.equal(panel.style.top, '418px');
        assert.equal(focus(), card.dataset.focus || card.dataset.panel);
    }
});

test('repeat uses existing memory and media form searches only nonempty topics', () => {
    const { elements, repeats, searches } = setup();
    elements.get('feature-repeat-btn').click();
    assert.deepEqual(repeats, ['repeat']);
    const input = elements.get('media-search-input');
    const form = elements.get('media-search-form');
    let prevented = 0;
    input.value = '   ';
    form.submit({ preventDefault() { prevented++; } });
    assert.deepEqual(searches, []);
    input.value = '  northern lights  ';
    form.submit({ preventDefault() { prevented++; } });
    assert.deepEqual(searches, ['northern lights']);
    assert.equal(prevented, 2);
});
