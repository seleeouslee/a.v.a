// A.V.A. voice chat engine — join a Discord voice channel, listen, transcribe, speak.
// 100% local, no API keys:
//   ears    : sherpa-onnx (whisper base.en) — auto-downloaded once (~140MB)
//   mouth   : Windows built-in speech voices via the `say` package
//   plumbing: @discordjs/voice + prism-media + ffmpeg-static

const path = require('path');
const fs = require('fs');
const https = require('https');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    EndBehaviorType,
} = require('@discordjs/voice');
const prism = require('prism-media');
const { execFile } = require('child_process');


const MODEL_FILES = [
    'base.en-encoder.int8.onnx',
    'base.en-decoder.int8.onnx',
    'base.en-tokens.txt',
];
const MODEL_BASE_URL = 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-base.en/resolve/main/';
const MODEL_DIR = path.join(__dirname, 'models', 'sherpa-onnx-whisper-base.en');
const TMP_DIR = path.join(__dirname, 'voice_tmp');

let recognizer = null;
let connection = null;
let player = null;
let listenUserId = null;
let busy = false;      // capturing / transcribing / thinking
let speaking = false;  // playing TTS — incoming audio ignored to avoid echo
let onTranscript = null;

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const go = (u, redirectsLeft) => {
            https.get(u, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    if (redirectsLeft <= 0) return reject(new Error('Too many redirects downloading model'));
                    res.resume();
                    return go(new URL(res.headers.location, u).toString(), redirectsLeft - 1);
                }
                if (res.statusCode !== 200) {
                    res.resume();
                    return reject(new Error('Model download failed: HTTP ' + res.statusCode));
                }
                const file = fs.createWriteStream(dest);
                res.pipe(file);
                file.on('finish', () => file.close(resolve));
                file.on('error', (e) => { fs.unlink(dest, () => {}); reject(e); });
            }).on('error', reject);
        };
        go(url, 5);
    });
}

// Downloads the whisper model on first use (one time only, ~140MB).
async function ensureModel(statusCb) {
    ensureDir(MODEL_DIR);
    for (const f of MODEL_FILES) {
        const dest = path.join(MODEL_DIR, f);
        if (fs.existsSync(dest)) continue;
        if (statusCb) await statusCb('Downloading voice model: ' + f + ' (one time only)');
        await downloadFile(MODEL_BASE_URL + f, dest);
    }
}

function getRecognizer() {
    if (!recognizer) {
        const sherpa = require('sherpa-onnx-node');
        recognizer = new sherpa.OfflineRecognizer({
            modelConfig: {
                whisper: {
                    encoder: path.join(MODEL_DIR, 'base.en-encoder.int8.onnx'),
                    decoder: path.join(MODEL_DIR, 'base.en-decoder.int8.onnx'),
                    language: 'en',
                    task: 'transcribe',
                },
                tokens: path.join(MODEL_DIR, 'base.en-tokens.txt'),
                numThreads: 4,
            },
        });
    }
    return recognizer;
}

function transcribe(samples16kMono) {
    const rec = getRecognizer();
    const stream = rec.createStream();
    stream.acceptWaveform({ samples: samples16kMono, sampleRate: 16000 });
    rec.decode(stream);
    const result = rec.getResult(stream);
    return ((result && result.text) || '').trim();
}

// 48kHz stereo s16le (Discord) -> 16kHz mono float32 (whisper)
function toMono16k(pcm) {
    const frames = Math.floor(pcm.length / 4);
    const outLen = Math.floor(frames / 3);
    const out = new Float32Array(outLen);
    let sumSq = 0;
    for (let i = 0; i < outLen; i++) {
        const o = i * 3 * 4;
        const l = pcm.readInt16LE(o);
        const r = pcm.readInt16LE(o + 2);
        const v = ((l + r) / 2) / 32768;
        out[i] = v;
        sumSq += v * v;
    }
    return {
        samples: out,
        seconds: outLen / 16000,
        rms: Math.sqrt(sumSq / Math.max(1, outLen)),
    };
}

// Records one utterance: starts on speech, stops after ~1.2s of silence.
function captureUtterance(receiver, userId) {
    return new Promise((resolve, reject) => {
        const opusStream = receiver.subscribe(userId, {
            end: { behavior: EndBehaviorType.AfterSilence, duration: 1200 },
        });
        const decoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });
        const chunks = [];
        let finished = false;
        const finish = (err) => {
            if (finished) return;
            finished = true;
            try { opusStream.destroy(); } catch (e) {}
            try { decoder.destroy(); } catch (e) {}
            if (err) reject(err);
            else resolve(Buffer.concat(chunks));
        };
        decoder.on('data', (c) => chunks.push(c));
        decoder.on('end', () => finish(null));
        decoder.on('error', finish);
        opusStream.on('error', finish);
        opusStream.pipe(decoder);
    });
}

function scrubForSpeech(t) {
    return String(t)
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[*_~#>|\u2014\u2013]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 600); // keep spoken replies snappy
}

const PIPER_EXE = path.join(__dirname, 'piper', 'piper.exe');
const PIPER_VOICE = path.join(__dirname, 'piper', 'en_GB-jenny_dioco-medium.onnx');

function speakToFile(text) {
    return new Promise((resolve, reject) => {
        ensureDir(TMP_DIR);
        const clean = scrubForSpeech(text);
        if (!clean) return reject(new Error('Nothing to say'));
        const out = path.join(TMP_DIR, 'ava-' + Date.now() + '.wav');
        const child = execFile(PIPER_EXE, ['--model', PIPER_VOICE, '--output_file', out], (err) => {
            if (err) return reject(err);
            resolve(out);
        });
        child.stdin.write(clean);
        child.stdin.end();
    });
}


async function playWav(wavPath) {
    const resource = createAudioResource(wavPath);
    player.play(resource);
    speaking = true;
    try {
        await entersState(player, AudioPlayerStatus.Idle, 180000);
    } catch (e) {
        // playback timeout — move on
    } finally {
        speaking = false;
        fs.unlink(wavPath, () => {});
    }
}

async function handleUtterance(receiver, speakerId) {
    const pcm = await captureUtterance(receiver, speakerId);
    const { samples, seconds, rms } = toMono16k(pcm);
    if (seconds < 0.4 || rms < 0.015) return; // too short, or just background noise
    const text = transcribe(samples);
    if (!text) return;
    if (!onTranscript) return;
    const reply = await onTranscript(speakerId, text);
    if (reply && String(reply).trim()) {
        const wav = await speakToFile(reply);
        await playWav(wav);
    }
}

async function join(voiceChannel, userId, transcriptHandler) {
    await leave();
    onTranscript = transcriptHandler;
    listenUserId = userId;

    connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
    });
    await entersState(connection, VoiceConnectionStatus.Ready, 30000);

    player = createAudioPlayer();
    connection.subscribe(player);

    const receiver = connection.receiver;
    receiver.speaking.on('start', (speakerId) => {
        if (speakerId !== listenUserId) return; // v1: only the person who summoned her
        if (busy || speaking) return;          // one thing at a time; never echo herself
        busy = true;
        handleUtterance(receiver, speakerId)
            .catch((e) => console.error('[voice] utterance error:', e.message))
            .finally(() => { busy = false; });
    });
}

async function leave() {
    try { if (player) player.stop(true); } catch (e) {}
    try { if (connection) connection.destroy(); } catch (e) {}
    connection = null;
    player = null;
    listenUserId = null;
    onTranscript = null;
    busy = false;
    speaking = false;
}

function isInVoice() { return !!connection; }

module.exports = { ensureModel, getRecognizer, join, leave, isInVoice };
