// Notion task synchronization. Uses credentials from settings.js.

document.getElementById('auth-notion-btn').addEventListener('click', async () => {
    if (!NOTION_SECRET || !NOTION_DB) {
        alert("Please enter your Notion credentials in the System Preferences (CTRL+A+M).");
        return;
    }
    await fetchNotionData();
});

async function fetchNotionData() {
    const syncBtn = document.getElementById('auth-notion-btn');
    const listEl = document.getElementById('schedule-list');

    syncBtn.innerText = "SYNCING...";
    listEl.innerHTML = '<li>Accessing mainframe...</li>';

    const proxyUrl = 'https://corsproxy.io/?';
    const targetUrl = `https://api.notion.com/v1/databases/${NOTION_DB}/query`;

    try {
        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_SECRET}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        const data = await response.json();

        if (data.results) {
            syncBtn.innerText = "NOTION SYNCED";
            syncBtn.classList.add('highlight');
            listEl.innerHTML = '';

            data.results.forEach((page, index) => {
                let taskName = "Unnamed Directive";
                if (page.properties.Name && page.properties.Name.title.length > 0) {
                    taskName = page.properties.Name.title[0].plain_text;
                }

                listEl.innerHTML += `
                    <li>
                        <input type="checkbox" id="ntn-task${index}">
                        <label for="ntn-task${index}">${taskName}</label>
                    </li>`;
            });
        } else {
            listEl.innerHTML = `<li>Error: ${data.message || 'Unknown API error'}</li>`;
            syncBtn.innerText = "SYNC FAILED";
        }
    } catch (err) {
        console.error("Notion fetch error:", err);
        listEl.innerHTML = '<li>CONNECTION ERROR. Check console.</li>';
        syncBtn.innerText = "SYNC FAILED";
    }
}
