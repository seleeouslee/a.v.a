// Canvas character animation and resize handling.

const canvas = document.getElementById('ai-brain-canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const aiChars = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()<>{}[]/\\|'.split('');
const fontSize = 16;
let columns = canvas.width / fontSize;
let drops = [];

for (let x = 0; x < columns; x++) {
    drops[x] = Math.random() * canvas.height;
}

function drawAiStream() {
    ctx.fillStyle = 'rgba(0, 5, 10, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const rootStyles = getComputedStyle(document.documentElement);
    const themeColor = rootStyles.getPropertyValue('--hud-cyan').trim() || '#00f3ff';

    ctx.fillStyle = themeColor;
    ctx.font = fontSize + 'px "Rajdhani", monospace';
    ctx.fontWeight = 'bold';

    for (let i = 0; i < drops.length; i++) {
        const text = aiChars[Math.floor(Math.random() * aiChars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

//setInterval(drawAiStream, 45);

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = canvas.width / fontSize;
    drops = [];
    for (let x = 0; x < columns; x++) {
        drops[x] = Math.random() * canvas.height;
    }
});
