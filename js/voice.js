// Speech recognition, wake word filtering, speech synthesis, and command input. Calls commands.js.

// --- A.V.A. STERN WAKE-WORD VOICE ENGINE ---
const startCommBtn = document.getElementById('start-comm-btn');
const commStatus = document.getElementById('comm-status');
const visualizer = document.getElementById('voice-visualizer');
const manualCmdInput = document.getElementById('manual-command-input');

let commActive = false;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let recognitionRunning = false;
let recognitionStarting = false;
let replySpeaking = false;
let speechGeneration = 0;
let wakeUntil = 0;

function startListening() {
    if (!commActive || !recognition || recognitionRunning || recognitionStarting || replySpeaking) return;
    recognitionStarting = true;
    try {
        recognition.start();
    } catch (error) {
        recognitionStarting = false;
        if (error.name !== 'InvalidStateError') stopListening('MICROPHONE COULD NOT START. Check browser microphone permissions.');
    }
}

function stopListening(status = 'STANDBY') {
    commActive = false;
    recognitionStarting = false;
    wakeUntil = 0;
    if (recognition) {
        try { recognition.stop(); } catch (error) {}
    }
    commStatus.innerText = status;
    commStatus.classList.remove('highlight');
    startCommBtn.innerText = 'ACTIVATE VOICE COMM';
    visualizer.classList.remove('active');
}

// Strip markdown/symbols so they aren't read aloud as choppy pauses.
function cleanForSpeech(text) {
    return String(text || '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[*_#>`~|]/g, '')
        .replace(/&/g, ' and ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// Split into sentences so long replies queue smoothly instead of one choppy block.
function chunkSentences(text) {
    const parts = text.match(/[^.!?]+[.!?]+["']?/g) || [];
    const rest = text.slice(parts.join('').length).trim();
    if (rest) parts.push(rest);
    return parts.length ? parts : [text];
}

function getAvaVoices() {
    return window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
}

// Prefer natural/neural voices; fall back to any clear English voice.
function pickAvaVoice() {
    const voices = getAvaVoices();
    if (!voices.length) return null;
    const savedUri = localStorage.getItem('stark_tts_voice');
    if (savedUri) {
        const saved = voices.find(v => v.voiceURI === savedUri);
        if (saved) return saved;
    }
    const prefs = [
        v => /natural/i.test(v.name) && /^en/i.test(v.lang),
        v => /google uk english female/i.test(v.name),
        v => /google us english/i.test(v.name),
        v => /samantha/i.test(v.name),
        v => /zira|aria/i.test(v.name),
        v => /female/i.test(v.name) && /^en/i.test(v.lang),
        v => /^en[-_]us/i.test(v.lang),
        v => /^en/i.test(v.lang),
    ];
    for (const test of prefs) {
        const found = voices.find(test);
        if (found) return found;
    }
    return voices[0];
}

function speak(text, callback) {
    // Keep the last response available even when this browser has no speech output.
    recordAvaMemory(text);
    if (!window.speechSynthesis) {
        if (callback) callback();
        return;
    }
    const generation = ++speechGeneration;
    replySpeaking = true;
    window.speechSynthesis.cancel();

    if (recognition) {
        try { recognition.stop(); } catch(e) {}
    }

    const cleanText = cleanForSpeech(text) || text;
    const voice = pickAvaVoice();
    const sentences = chunkSentences(cleanText);

    const finishSpeaking = () => {
        if (generation !== speechGeneration) return;
        replySpeaking = false;
        if (callback) callback();
        startListening();
    };

    sentences.forEach((sentence, i) => {
        const utterance = new SpeechSynthesisUtterance(sentence);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        if (voice) utterance.voice = voice;
        if (i === sentences.length - 1) {
            utterance.onend = finishSpeaking;
            utterance.onerror = finishSpeaking;
        }
        window.speechSynthesis.speak(utterance);
    });
}

    // Keep the last response available even when this browser has no speech output.
    recordAvaMemory(text);
    if (!window.speechSynthesis) {
        if (callback) callback();
        return;
    }
    const generation = ++speechGeneration;
    replySpeaking = true;
    window.speechSynthesis.cancel();
    
    if (recognition) {
        try { recognition.stop(); } catch(e) {}
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;

    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v =>
        v.name.includes('Google UK English Female') ||
        v.name.includes('Samantha') ||
        v.name.includes('Victoria') ||
        v.name.includes('Zira') ||
        (v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
    );
    if (femaleVoice) utterance.voice = femaleVoice;

    const finishSpeaking = () => {
        if (generation !== speechGeneration) return;
        replySpeaking = false;
        if (callback) callback();
        startListening();
    };
    utterance.onend = finishSpeaking;
    utterance.onerror = finishSpeaking;

    window.speechSynthesis.speak(utterance);
}

// Voice picker (settings panel): list English voices, remember the choice.
function populateVoiceSelect() {
    const select = document.getElementById('voice-select');
    if (!select || !window.speechSynthesis) return;
    const savedUri = localStorage.getItem('stark_tts_voice');
    select.innerHTML = '';
    getAvaVoices().filter(v => /^en/i.test(v.lang)).forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.textContent = `${v.name} (${v.lang})`;
        if (v.voiceURI === savedUri) opt.selected = true;
        select.appendChild(opt);
    });
}

if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = populateVoiceSelect;
    populateVoiceSelect();
}

document.getElementById('voice-select')?.addEventListener('change', (e) => {
    localStorage.setItem('stark_tts_voice', e.target.value);
});
document.getElementById('voice-preview-btn')?.addEventListener('click', () => {
    speak('Good morning, sir. All systems are now fully operational.');
});


if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        recognitionStarting = false;
        recognitionRunning = true;
        if (!commActive) {
            try { recognition.stop(); } catch (error) {}
            return;
        }
        commStatus.innerText = "LISTENING (SAY 'AVA')...";
        commStatus.classList.add('highlight');
        visualizer.classList.add('active');
    };

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript + ' ';
        }
        transcript = transcript.trim();
        manualCmdInput.value = transcript;
        commStatus.innerText = `HEARING: "${transcript}"`;

        if (event.results[event.results.length - 1].isFinal) {
            const textLower = transcript.toLowerCase();

            // Accept AVA and EVA, including their dotted spellings, as whole wake words.
            const wake = /\b(?:[ae]\.v\.a\.|[ae]va\b)[\s.,!?:-]*/i.exec(textLower);
            if (wake || Date.now() < wakeUntil) {
                const commandPart = wake ? transcript.slice(wake.index + wake[0].length).trim() : transcript;

                if (commandPart.length > 0) {
                    wakeUntil = 0;
                    submitAvaCommand(commandPart);
                } else {
                    // Let the user pause after the wake word without talking over them.
                    wakeUntil = Date.now() + 8000;
                    commStatus.innerText = "ONLINE // AWAITING DIRECTIVE";
                }
            } else {
                commStatus.innerText = `HEARD: "${transcript}" — SAY 'AVA' BEFORE YOUR COMMAND`;
            }
        }
    };

    recognition.onerror = (event) => {
        const errors = {
            'not-allowed': 'MICROPHONE BLOCKED. Allow microphone access in your browser, then activate voice again.',
            'service-not-allowed': 'SPEECH SERVICE BLOCKED. Check browser permissions, then activate voice again.',
            'audio-capture': 'NO MICROPHONE AVAILABLE. Check your microphone connection and browser input device.',
            'network': 'SPEECH CONNECTION FAILED. Check your connection, then activate voice again.'
        };
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
            stopListening(errors[event.error] || `COMM ERROR: ${event.error.toUpperCase()}. Activate voice to retry.`);
        }
    };

    recognition.onend = () => {
        recognitionRunning = false;
        recognitionStarting = false;
        startListening();
    };
} else {
    commStatus.innerText = "SPEECH-TO-TEXT NOT SUPPORTED.";
}

startCommBtn.addEventListener('click', () => {
    if (!commActive) {
        if (recognition) {
            commActive = true;
            startCommBtn.innerText = "DEACTIVATE COMM";
            commStatus.innerText = "COMM ACTIVE // SAY 'AVA'";
            commStatus.classList.add('highlight');
            visualizer.classList.add('active');

            // Request the microphone directly from the user's click; do not wait
            // for a spoken greeting, which may never finish in some browsers.
            startListening();
        } else {
            alert("Speech recognition is not supported in your browser.");
        }
    } else {
        stopListening();
    }
});

async function submitAvaCommand(text) {
    try {
        await processAvaCommand(text);
    } catch (error) {
        console.error('Command failed:', error);
        commStatus.innerText = 'COMMAND FAILED. Please try again or reload A.V.A.';
    }
}

function sendManualCommand() {
    const text = manualCmdInput.value.trim();
    if (!text) return;
    manualCmdInput.value = '';
    return submitAvaCommand(text);
}

manualCmdInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.isComposing || event.repeat) return;
    event.preventDefault();
    return sendManualCommand();
});
document.getElementById('send-command-btn').addEventListener('click', sendManualCommand);
