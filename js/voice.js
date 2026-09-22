// Speech recognition, wake word filtering, speech synthesis, and command input. Calls commands.js.

// --- A.V.A. STERN WAKE-WORD VOICE ENGINE ---
const startCommBtn = document.getElementById('start-comm-btn');
const commStatus = document.getElementById('comm-status');
const visualizer = document.getElementById('voice-visualizer');
const manualCmdInput = document.getElementById('manual-command-input');

let commActive = false;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

function speak(text, callback) {
    if (!window.speechSynthesis) {
        if (callback) callback();
        return;
    }
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

    utterance.onend = () => {
        if (callback) callback();
        if (commActive && recognition) {
            setTimeout(() => {
                try { recognition.start(); } catch(e) {}
            }, 400);
        }
    };

    window.speechSynthesis.speak(utterance);
}

if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {};
}

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        commStatus.innerText = "LISTENING (SAY 'AVA' OR 'EVA')...";
        commStatus.classList.add('highlight');
        visualizer.classList.add('active');
    };

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
        }
        manualCmdInput.value = transcript;
        commStatus.innerText = `HEARING: "${transcript}"`;

        if (event.results[event.results.length - 1].isFinal) {
            const textLower = transcript.toLowerCase();

            // Accept AVA and EVA, including their dotted spellings, as whole wake words.
            if (/\b(?:[ae]\.v\.a\.|[ae]va\b)/i.test(textLower)) {
                let commandPart = transcript.replace(/\b(?:[ae]\.v\.a\.|[ae]va\b)[\s,:-]*/i, "").trim();

                if (commandPart.length > 0) {
                    processAvaCommand(commandPart);
                } else {
                    speak("Online. What do you need?");
                    commStatus.innerText = "ONLINE // AWAITING DIRECTIVE";
                }
            } else {
                commStatus.innerText = "IGNORED (SAY 'AVA' OR 'EVA')";
                setTimeout(() => {
                    if (commActive) commStatus.innerText = "LISTENING (SAY 'AVA' OR 'EVA')...";
                }, 1500);
            }
        }
    };

    recognition.onerror = (event) => {
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
            commStatus.innerText = `COMM ERROR: ${event.error.toUpperCase()}`;
        }
    };

    recognition.onend = () => {
        if (commActive && !window.speechSynthesis.speaking) {
            try {
                recognition.start();
            } catch(e) {}
        }
    };
} else {
    commStatus.innerText = "SPEECH-TO-TEXT NOT SUPPORTED.";
}

startCommBtn.addEventListener('click', () => {
    if (!commActive) {
        if (recognition) {
            commActive = true;
            startCommBtn.innerText = "DEACTIVATE COMM";
            commStatus.innerText = "COMM ACTIVE // SAY 'AVA' OR 'EVA'";
            commStatus.classList.add('highlight');
            visualizer.classList.add('active');

            speak("Voice comm active. Say Ava or Eva followed by your command.", () => {
                try { recognition.start(); } catch(e) {}
            });
        } else {
            alert("Speech recognition is not supported in your browser.");
        }
    } else {
        commActive = false;
        if (recognition) {
            try { recognition.stop(); } catch(e) {}
        }
        commStatus.innerText = "STANDBY";
        commStatus.classList.remove('highlight');
        startCommBtn.innerText = "ACTIVATE VOICE COMM";
        visualizer.classList.remove('active');
    }
});

manualCmdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && manualCmdInput.value.trim() !== "") {
        processAvaCommand(manualCmdInput.value);
        manualCmdInput.value = "";
    }
});
