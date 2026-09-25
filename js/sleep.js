// Idle sleep mode: after 60s of no user activity, fade in a full-screen
// overlay showing only a spinning wireframe globe. Any activity dismisses
// it instantly and restarts the timer. Toggleable from the settings panel,
// persisted in localStorage (key: stark_sleep_mode, 'on' | 'off', default 'on').

(function () {
    'use strict';

    var SLEEP_TIMEOUT_MS = 150 * 1000;
    var STORAGE_KEY = 'stark_sleep_mode';
    var GLOBE_COLOR = 0x00f3ff; // match HUD cyan

    var sleepScreen = document.getElementById('sleep-screen');
    var sleepToggle = document.getElementById('sleep-mode-toggle');
    var globeCanvas = document.getElementById('sleep-globe-canvas');

    if (!sleepScreen || !sleepToggle || !globeCanvas) return;

    var sleepEnabled = (localStorage.getItem(STORAGE_KEY) || 'on') === 'on';
    var idleTimer = null;

    var renderer = null;
    var scene = null;
    var camera = null;
    var globes = [];
    var rafId = null;
    var globeReady = false;

    function initGlobe() {
        if (typeof THREE === 'undefined') return; // CDN failed: overlay still covers screen
        renderer = new THREE.WebGLRenderer({ canvas: globeCanvas, antialias: true, alpha: true });
        renderer.setClearColor(0x000000, 0);
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.z = 3.4;

        var inner = new THREE.Mesh(
            new THREE.SphereGeometry(1, 28, 20),
            new THREE.MeshBasicMaterial({ color: GLOBE_COLOR, wireframe: true, transparent: true, opacity: 0.85 })
        );
        var outer = new THREE.Mesh(
            new THREE.SphereGeometry(1.3, 14, 10),
            new THREE.MeshBasicMaterial({ color: GLOBE_COLOR, wireframe: true, transparent: true, opacity: 0.22 })
        );
        inner.rotation.x = 0.35;
        outer.rotation.x = -0.2;
        scene.add(inner);
        scene.add(outer);
        globes = [inner, outer];
        globeReady = true;
        sizeRenderer();
    }

    function sizeRenderer() {
        if (!renderer) return;
        var size = Math.min(globeCanvas.clientWidth || 480, globeCanvas.clientHeight || 480);
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        renderer.setPixelRatio(dpr);
        renderer.setSize(size, size, false);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
    }

    function tick() {
        globes[0].rotation.y += 0.004;
        globes[1].rotation.y -= 0.0025;
        renderer.render(scene, camera);
        rafId = requestAnimationFrame(tick);
    }

    function startGlobe() {
        if (!globeReady) initGlobe();
        if (!globeReady) return;
        sizeRenderer();
        if (rafId === null) tick();
    }

    function stopGlobe() {
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    function enterSleep() {
        if (!sleepEnabled) return;
        sleepScreen.classList.add('sleep-active');
        sleepScreen.setAttribute('aria-hidden', 'false');
        startGlobe();
    }

    function exitSleep() {
        sleepScreen.classList.remove('sleep-active');
        sleepScreen.setAttribute('aria-hidden', 'true');
        stopGlobe();
    }

    function resetIdleTimer() {
        if (sleepScreen.classList.contains('sleep-active')) exitSleep();
        if (idleTimer !== null) clearTimeout(idleTimer);
        if (sleepEnabled) idleTimer = setTimeout(enterSleep, SLEEP_TIMEOUT_MS);
    }

    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'click'].forEach(function (ev) {
        document.addEventListener(ev, resetIdleTimer, { capture: true, passive: true });
    });
    window.addEventListener('resize', function () {
        if (sleepScreen.classList.contains('sleep-active')) sizeRenderer();
    });

    sleepToggle.checked = sleepEnabled;
    sleepToggle.addEventListener('change', function () {
        sleepEnabled = sleepToggle.checked;
        try {
            localStorage.setItem(STORAGE_KEY, sleepEnabled ? 'on' : 'off');
        } catch (e) { /* storage unavailable: keep session-only */ }
        if (!sleepEnabled) {
            if (idleTimer !== null) clearTimeout(idleTimer);
            exitSleep();
        } else {
            resetIdleTimer();
        }
    });

    resetIdleTimer();
})();
