/* --- Idle sleep mode: full-screen wireframe globe overlay --- */
#sleep-screen {
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: radial-gradient(circle at center, #04121a 0%, #010304 70%);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 1.2s ease, visibility 0s linear 1.2s;
}

#sleep-screen.sleep-active {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transition: opacity 1.2s ease;
}

#sleep-globe-canvas {
    width: min(72vmin, 640px);
    height: min(72vmin, 640px);
    display: block;
}

.toggle-row {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    margin: 8px 0;
}

.toggle-row input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #00f3ff;
}
