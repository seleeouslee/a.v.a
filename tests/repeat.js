// 1. The Memory Variable
let avaLastWords = "";

// 2. The Speak Function (Updates memory before talking)
// Note: Because this is in its own file, make sure this is loaded AFTER your main variables 
// but BEFORE your other logic so it overrides any other speak() functions.
function speak(text, callback) {
    if (!window.speechSynthesis) {
        if (callback) callback();
        return;
    }
    
    // Stop any ongoing speech or listening
    window.speechSynthesis.cancel();
    if (typeof recognition !== 'undefined' && recognition) {
        try { recognition.stop(); } catch(e) {}
    }

    // --- MEMORY INTERCEPT ---
    // Save the text to avaLastWords, unless it's the "empty memory" warning itself
    if (text !== "I have no previous transmissions in memory.") {
        avaLastWords = text;
    }
    // ------------------------

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    
    // Attempt to find a suitable AI voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => 
        v.name.includes('Google UK English Female') || 
        v.name.includes('Samantha') || 
        v.name.includes('Victoria') || 
        v.name.includes('Zira') ||
        (v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
    );
    if (femaleVoice) utterance.voice = femaleVoice;

    // Resume listening after speaking finishes
    utterance.onend = () => {
        if (callback) callback();
        if (typeof commActive !== 'undefined' && commActive && typeof recognition !== 'undefined' && recognition) {
            setTimeout(() => { try { recognition.start(); } catch(e) {} }, 400);
        }
    };

    window.speechSynthesis.speak(utterance);
}

// 3. The Repeat Command Checker
// This function checks if the user asked to repeat, handles it, and returns true/false.
function checkRepeatCommand(command) {
    if (command === "repeat" || command === "repeat that" || command === "repeat last") {
        const commStatus = document.getElementById('comm-status');
        
        if (avaLastWords !== "") {
            if (commStatus) commStatus.innerText = "REPLAYING MEMORY...";
            speak(avaLastWords);
        } else {
            if (commStatus) commStatus.innerText = "MEMORY EMPTY";
            speak("I have no previous transmissions in memory.");
        }
        return true; // Indicates the command was handled here
    }
    return false; // Indicates it wasn't a repeat command, proceed to normal LLM/logic
}
