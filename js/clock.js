// Clock and calendar display.

function updateTime() {
    const now = new Date();
    document.getElementById('clock').innerText = now.toLocaleTimeString('en-US', { hour12: false });
    document.getElementById('date').innerText = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
setInterval(updateTime, 1000);
updateTime();
