// Model requests and spoken replies. Uses settings.js and voice.js.

// Conversation memory: recent exchanges, sent with each request so A.V.A.
// remembers earlier in the session. (Cleared on page reload.)
const avaChatHistory = [];
const AVA_MAX_HISTORY = 20; // last 10 back-and-forth exchanges

function trimAvaHistory() {
    while (avaChatHistory.length > AVA_MAX_HISTORY) avaChatHistory.shift();
}

async function requestAiReply(text) {
    // Fallback if no LLM configured
    if (!LLM_ENDPOINT) {
        commStatus.innerText = "LOCAL COMMAND EXECUTED";
        speak("Command executed locally.");
        return;
    }

    avaChatHistory.push({ role: "user", content: text });
    trimAvaHistory();

    // 5. Send to Local LLM / Ollama
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (LLM_API_KEY) headers['Authorization'] = `Bearer ${LLM_API_KEY}`;

        const response = await fetch(LLM_ENDPOINT, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: LLM_MODEL || 'llama3',
                messages: [
                    { role: "system", content: "You are A.V.A., an advanced virtual assistant inspired by J.A.R.V.I.S. from Iron Man. Keep your responses concise (under 2 sentences), sharp, and helpful." },
                    ...avaChatHistory
                ],
                stream: false
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]?.message?.content) {
            const aiReply = data.choices[0].message.content.trim();
            avaChatHistory.push({ role: "assistant", content: aiReply });
            trimAvaHistory();
            commStatus.innerText = aiReply.toUpperCase();
            speak(aiReply);
        } else {
            console.error("Local LLM response error:", data);
            commStatus.innerText = "LOCAL LLM ERROR";
            speak("Mainframe communication error.");
        }
    } catch (err) {
        console.error("Local LLM connection error:", err);
        commStatus.innerText = "OFFLINE MODE";
        speak("Local server unreachable.");
    }
}
