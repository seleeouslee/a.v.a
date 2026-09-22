// 1. The Memory Variable
let avaLastWords = "";

// 2. Memory Intercept Function
// NOTE: Call recordAvaMemory(text) inside your existing speak() function in js/voice.js
function recordAvaMemory(text) {
    // Prevent A.V.A. from saving her empty memory warning as an actual memory
    const cleaned = String(text || '').trim();
    if (cleaned !== "I have no previous transmissions in memory." && cleaned !== "") {
        avaLastWords = cleaned;
    }
}

// 3. The Repeat Command Checker
// NOTE: Call checkRepeatCommand(command) at the top of processAvaCommand() in js/commands.js
function checkRepeatCommand(command) {
    const normalized = String(command || '').toLowerCase().trim()
        .replace(/[.!?,]+$/g, '')
        .replace(/\s+/g, ' ');
    if (normalized === "repeat" || normalized === "repeat that" || normalized === "repeat last" ||
        normalized === "repeat it" || normalized === "say that again") {
        const commStatus = document.getElementById('comm-status');
        
        if (avaLastWords !== "") {
            if (commStatus) commStatus.innerText = "REPLAYING MEMORY...";
            
            // Triggers your global speak function
            if (typeof speak === "function") {
                speak(avaLastWords);
            }
        } else {
            if (commStatus) commStatus.innerText = "MEMORY EMPTY";
            
            if (typeof speak === "function") {
                speak("I have no previous transmissions in memory.");
            }
        }
        return true; // Tells your command processor to stop because we handled it here
    }
    return false; // Tells your command processor to continue normally
}
