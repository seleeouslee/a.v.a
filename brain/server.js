// A.V.A. central brain — one memory per user, one local LLM.
// Run (PowerShell, next to Ollama):  node server.js
// Dashboard: settings (Ctrl+A+M) -> Central Brain URL -> http://localhost:3001
// Discord bot: set brainUrl in its CONFIG. No npm install needed — zero dependencies.

const http = require('http');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    port: 3001,
    ollamaEndpoint: 'http://localhost:11434/v1/chat/completions',
    model: 'llama3.2',
    // Your Discord user ID -> shares the "owner" memory with the dashboard.
    // Discord: Settings -> Advanced -> Developer Mode -> right-click your name -> Copy User ID.
    ownerDiscordId: '',
    systemPrompt: 'You are A.V.A., an advanced virtual assistant inspired by J.A.R.V.I.S. from Iron Man. Keep your responses concise (under 2 sentences), sharp, and helpful.',
};

const MAX_HISTORY = 20; // last 10 back-and-forth exchanges per user
const MEMORY_FILE = path.join(__dirname, 'memory.json');

let memories = {};
try { memories = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')); }
catch (e) { memories = {}; }

function saveMemories() {
    const tmp = MEMORY_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(memories));
    fs.renameSync(tmp, MEMORY_FILE);
}

function getHistory(userId) {
    if (!memories[userId]) memories[userId] = [];
    return memories[userId];
}

function resolveUser(body) {
    const userId = String(body.userId || 'anonymous');
    if (CONFIG.ownerDiscordId && userId === CONFIG.ownerDiscordId) return 'owner';
    return userId;
}

async function askOllama(history) {
    const res = await fetch(CONFIG.ollamaEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: CONFIG.model,
            messages: [{ role: 'system', content: CONFIG.systemPrompt }, ...history],
            stream: false,
        }),
    });
    if (!res.ok) throw new Error('Ollama HTTP ' + res.status);
    const data = await res.json();
    const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!reply) throw new Error('Empty reply from model');
    return reply.trim();
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
        req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch (e) { reject(e); } });
        req.on('error', reject);
    });
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    // Lets https pages (e.g. GitHub Pages) reach this localhost server.
    'Access-Control-Allow-Private-Network': 'true',
};

function send(res, code, obj) {
    res.writeHead(code, Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS));
    res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS_HEADERS);
        return res.end();
    }
    try {
        if (req.method === 'GET' && req.url === '/health') {
            return send(res, 200, { ok: true, users: Object.keys(memories).length });
        }
        if (req.method === 'POST' && req.url === '/chat') {
            const body = await readBody(req);
            const text = String(body.text || '').trim();
            if (!text) return send(res, 400, { error: 'Missing text' });
            const userId = resolveUser(body);
            const history = getHistory(userId);
            history.push({ role: 'user', content: text });
            while (history.length > MAX_HISTORY) history.shift();
            try {
                const reply = await askOllama(history);
                history.push({ role: 'assistant', content: reply });
                while (history.length > MAX_HISTORY) history.shift();
                saveMemories();
                return send(res, 200, { reply, userId });
            } catch (e) {
                history.pop(); // don't remember failed exchanges
                console.error('Ollama error:', e.message);
                return send(res, 502, { error: 'Neural core unreachable. Is Ollama running?' });
            }
        }
        if (req.method === 'POST' && req.url === '/forget') {
            const body = await readBody(req);
            const userId = resolveUser(body);
            delete memories[userId];
            saveMemories();
            return send(res, 200, { ok: true });
        }
        return send(res, 404, { error: 'Not found' });
    } catch (e) {
        console.error(e);
        return send(res, 500, { error: 'Brain error' });
    }
});

server.listen(CONFIG.port, () => {
    console.log('A.V.A. brain online on http://localhost:' + CONFIG.port);
});
