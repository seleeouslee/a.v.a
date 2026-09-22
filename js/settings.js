// Preferences shortcut, stored integration settings, and save handling. Uses theme.js and weather.js.

const keysPressed = new Set();
document.addEventListener('keydown', (e) => {
    keysPressed.add(e.key.toLowerCase());

    if ((keysPressed.has('control') || e.ctrlKey || keysPressed.has('meta')) &&
        keysPressed.has('a') &&
        keysPressed.has('m')) {
        e.preventDefault();

        const apiWindow = document.getElementById('api-config');
        apiWindow.style.display = (apiWindow.style.display === 'none' || apiWindow.style.display === '') ? 'flex' : 'none';
    }
});

document.addEventListener('keyup', (e) => {
    keysPressed.delete(e.key.toLowerCase());
});

const llmEndpointInput = document.getElementById('llm-endpoint-input');
const llmModelInput = document.getElementById('llm-model-input');
const apiKeyInput = document.getElementById('api-key-input');
const notionSecretInput = document.getElementById('notion-secret-input');
const notionDbInput = document.getElementById('notion-db-input');
const saveKeyBtn = document.getElementById('save-key-btn');
const apiConfigWindow = document.getElementById('api-config');

let LLM_ENDPOINT = localStorage.getItem('stark_llm_endpoint') || 'http://localhost:11434/v1/chat/completions';
let LLM_MODEL = localStorage.getItem('stark_llm_model') || 'llama3';
let LLM_API_KEY = localStorage.getItem('stark_llm_key') || '';
let NOTION_SECRET = localStorage.getItem('stark_notion_secret') || '';
let NOTION_DB = localStorage.getItem('stark_notion_db') || '';

llmEndpointInput.value = LLM_ENDPOINT;
llmModelInput.value = LLM_MODEL;
apiKeyInput.value = LLM_API_KEY;
notionSecretInput.value = NOTION_SECRET;
notionDbInput.value = NOTION_DB;

saveKeyBtn.addEventListener('click', () => {
    LLM_ENDPOINT = llmEndpointInput.value || 'http://localhost:11434/v1/chat/completions';
    LLM_MODEL = llmModelInput.value || 'llama3';
    LLM_API_KEY = apiKeyInput.value;
    NOTION_SECRET = notionSecretInput.value;
    NOTION_DB = notionDbInput.value;

    const selectedTheme = themeSelect.value;
    const selectedLocation = manualLocInput.value;

    localStorage.setItem('stark_llm_endpoint', LLM_ENDPOINT);
    localStorage.setItem('stark_llm_model', LLM_MODEL);
    if (LLM_API_KEY) localStorage.setItem('stark_llm_key', LLM_API_KEY);
    if (NOTION_SECRET) localStorage.setItem('stark_notion_secret', NOTION_SECRET);
    if (NOTION_DB) localStorage.setItem('stark_notion_db', NOTION_DB);

    localStorage.setItem('stark_theme', selectedTheme);
    localStorage.setItem('stark_location', selectedLocation);

    applyTheme(selectedTheme);
    initSensors();

    apiConfigWindow.style.display = 'none';
});
