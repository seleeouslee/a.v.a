// Saved theme selection and CSS color variables.

const themeSelect = document.getElementById('theme-select');
const savedTheme = localStorage.getItem('stark_theme') || 'cyan';
themeSelect.value = savedTheme;
applyTheme(savedTheme);

function applyTheme(themeName) {
    const root = document.documentElement;
    if (themeName === 'cyan') {
        root.style.setProperty('--hud-cyan', '#00f3ff');
        root.style.setProperty('--hud-cyan-dim', 'rgba(0, 243, 255, 0.2)');
    } else if (themeName === 'crimson') {
        root.style.setProperty('--hud-cyan', '#ff3333');
        root.style.setProperty('--hud-cyan-dim', 'rgba(255, 51, 51, 0.2)');
    } else if (themeName === 'gold') {
        root.style.setProperty('--hud-cyan', '#ffcc00');
        root.style.setProperty('--hud-cyan-dim', 'rgba(255, 204, 0, 0.2)');
    }
}
