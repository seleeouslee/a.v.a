// A.V.A. Discord bot — talks to the central brain (same memory as the dashboard).
// Voice calls: !join / !leave — she listens, transcribes locally, and speaks back.
// Setup: DISCORD_TOKEN env var, brain running (node brain/server.js), Node 18+.
// Run (PowerShell):  $env:DISCORD_TOKEN="paste-your-token-here"; node discord-bot/bot.js

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const voice = require('./voice');

const CONFIG = {
    token: process.env.DISCORD_TOKEN,
    brainUrl: 'http://localhost:3001',
    prefix: '!ava',
    latitude: 43.65,   // Toronto — change to yours
    longitude: -79.38,
    timezone: 'America/Toronto',
};

if (!CONFIG.token) {
    console.error('Missing DISCORD_TOKEN. In PowerShell run: $env:DISCORD_TOKEN="paste-your-token-here"; node discord-bot/bot.js');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Channel],
});

function brain(path) {
    return CONFIG.brainUrl.replace(/\/$/, '') + path;
}

async function askBrain(userId, text) {
    const res = await fetch(brain('/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.reply) throw new Error((data && data.error) || 'Brain HTTP ' + res.status);
    return String(data.reply).trim();
}

async function forgetBrain(userId) {
    await fetch(brain('/forget'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
    }).catch(() => {});
}

// Discord messages cap at 2000 chars — split long replies.
async function sendChunked(channel, text) {
    const chunks = String(text).match(/[\s\S]{1,1900}/g) || [text];
    for (const c of chunks) await channel.send(c);
}

const WEATHER_CODES = {
    0: 'clear sky', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast',
    45: 'foggy', 48: 'icy fog', 51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle',
    61: 'light rain', 63: 'rain', 65: 'heavy rain',
    71: 'light snow', 73: 'snow', 75: 'heavy snow',
    80: 'light showers', 81: 'showers', 82: 'violent showers', 95: 'thunderstorm',
};
function clothingRec(tempC) {
    if (tempC < 0) return 'Heavy winter coat, hat, and gloves.';
    if (tempC < 8) return 'Warm coat and layers recommended.';
    if (tempC < 15) return 'Light jacket or sweater recommended.';
    if (tempC < 22) return 'Comfortable — a light layer is enough.';
    return 'Warm out — dress light and stay hydrated.';
}

async function morningBriefing() {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + CONFIG.latitude +
        '&longitude=' + CONFIG.longitude +
        '&current=temperature_2m,weather_code&timezone=' + encodeURIComponent(CONFIG.timezone);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather HTTP ' + res.status);
    const data = await res.json();
    const temp = Math.round(data.current.temperature_2m);
    const desc = WEATHER_CODES[data.current.weather_code] || 'changing conditions';
    const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: CONFIG.timezone });
    return 'Good morning, sir. It is currently ' + now + ' and ' + desc + ', ' + temp + '°C. Clothing recommendation: ' + clothingRec(temp);
}

client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot) return;

        const text = message.content.trim();
        const mentioned = message.mentions.has(client.user);
        const isDM = message.channel.isDMBased();
        const lower = text.toLowerCase();

        // --- built-in commands ---
        if (lower === '!help') {
            return sendChunked(message.channel,
                '**A.V.A. at your service.**\n' +
                '• Just DM me, @mention me, or use `!ava <message>` to talk.\n' +
                '• `!goodmorning` — time, weather, and clothing briefing.\n' +
                '• `!forget` — wipe my memory of you (shared with the dashboard).\n' +
                '• `!join` — I join your voice channel; just talk to me.\n' +
                '• `!leave` — I leave the voice channel.');
        }
        if (lower === '!forget') {
            await forgetBrain(message.author.id);
            return message.channel.send('Memory wiped, sir.');
        }
        if (lower === '!goodmorning') {
            await message.channel.sendTyping();
            try { return await sendChunked(message.channel, await morningBriefing()); }
            catch (e) { console.error(e); return message.channel.send('Briefing unavailable right now, sir.'); }
        }

        // --- voice calls ---
        if (lower === '!join') {
            if (!message.guild) return message.channel.send('Voice chat needs a server, sir — `!join` does not work in DMs.');
            const vc = message.member && message.member.voice ? message.member.voice.channel : null;
            if (!vc) return message.channel.send('Join a voice channel first, sir, then tell me `!join`.');
            const statusMsg = await message.channel.send('Warming up my ears...');
            try {
                await voice.ensureModel(async (s) => { try { await statusMsg.edit(s); } catch (e) {} });
                voice.getRecognizer(); // load now so the first transcription is fast
                await voice.join(vc, message.author.id, async (speakerId, heard) => {
                    await message.channel.send('**You:** ' + heard);
                    try {
                        const reply = await askBrain(speakerId, heard);
                        await message.channel.send('**A.V.A.:** ' + reply);
                        return reply;
                    } catch (e) {
                        console.error('Brain error:', e.message);
                        await message.channel.send('Central brain unreachable, sir. Is it running?');
                        return '';
                    }
                });
                await statusMsg.edit('Joined **' + vc.name + '**. Speak naturally, sir — I am listening. (`!leave` when done)');
            } catch (e) {
                console.error('Voice join error:', e);
                await voice.leave();
                await statusMsg.edit('Could not start voice chat: ' + e.message);
            }
            return;
        }
        if (lower === '!leave') {
            if (!voice.isInVoice()) return message.channel.send('I am not in a voice channel, sir.');
            await voice.leave();
            return message.channel.send('Leaving the call, sir.');
        }

        // --- talk to the brain ---
        let prompt = null;
        if (isDM) prompt = text;
        else if (mentioned) prompt = text.replace(/<@!?\d+>/g, '').trim();
        else if (lower.startsWith(CONFIG.prefix)) prompt = text.slice(CONFIG.prefix.length).trim();
        if (!prompt) return;

        await message.channel.sendTyping();
        try {
            const reply = await askBrain(message.author.id, prompt);
            await sendChunked(message.channel, reply);
        } catch (e) {
            console.error('Brain error:', e.message);
            await message.channel.send('Central brain unreachable, sir. Is it running?');
        }
    } catch (e) {
        console.error('Message handler error:', e);
    }
});

client.once('ready', () => {
    console.log('A.V.A. online as ' + client.user.tag);
});

client.login(CONFIG.token);
