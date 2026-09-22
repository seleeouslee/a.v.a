// Model requests and spoken replies. Uses settings.js and voice.js.

async function requestAiReply(text) {
    // Fallback if no LLM configured
    if (!LLM_ENDPOINT) {
        commStatus.innerText = "LOCAL COMMAND EXECUTED";
        speak("Command executed locally.");
        return;
    }

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
                    { role: "user", content: text }
                ],
                stream: false
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]?.message?.content) {
            const aiReply = data.choices[0].message.content.trim();
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
