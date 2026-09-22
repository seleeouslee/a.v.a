// 1. The Memory Variable
let avaLastWords = "";

// 2. Memory Intercept Function
// NOTE: Call recordAvaMemory(text) inside your existing speak() function in js/voice.js
function recordAvaMemory(text) {
    // Prevent A.V.A. from saving her empty memory warning as an actual memory
    if (text !== "I have no previous transmissions in memory." && text.trim() !== "") {
        avaLastWords = text;
    }
}

// 3. The Repeat Command Checker
// NOTE: Call checkRepeatCommand(command) at the top of processAvaCommand() in js/commands.js
function checkRepeatCommand(command) {
    if (command === "repeat" || command === "repeat that" || command === "repeat last") {
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
