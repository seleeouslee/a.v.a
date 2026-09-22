// Location selection, weather readings, and clothing suggestions.

const manualLocInput = document.getElementById('manual-location-input');
manualLocInput.value = localStorage.getItem('stark_location') || '';

async function fetchWeather(lat, lon, cityName = null) {
    try {
        if (!cityName) {
            const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
            const geoData = await geoRes.json();
            cityName = geoData.city || geoData.locality || 'Unknown Sector';
        }
        document.getElementById('location-name').innerText = `LOC: ${cityName}`;

        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const weatherData = await weatherRes.json();
        const temp = Math.round(weatherData.current_weather.temperature);
        const code = weatherData.current_weather.weathercode;

        document.getElementById('temperature').innerText = `${temp}°C`;

        let condition = "Clear";
        if (code >= 1 && code <= 3) condition = "Partly Cloudy";
        if (code >= 51 && code <= 67) condition = "Raining";
        if (code >= 71 && code <= 77) condition = "Snowing";
        if (code >= 95) condition = "Thunderstorm";

        document.getElementById('weather-desc').innerText = `COND: ${condition.toUpperCase()}`;

        let clothing = "";
        if (temp < 5) clothing = "Thermal layers and heavy coat required.";
        else if (temp < 15) clothing = "Light jacket or sweater recommended.";
        else if (temp < 25) clothing = "Standard attire optimal.";
        else clothing = "Cooling system active. Light fabrics advised.";

        if (condition === "Raining" || condition === "Thunderstorm") clothing += " Waterproof exterior needed.";

        document.getElementById('clothing-rec').innerText = `> ${clothing}`;

    } catch (e) {
        console.error("Weather sensor failure:", e);
        document.getElementById('weather-desc').innerText = "SENSOR DISCONNECTED";
    }
}

async function initSensors() {
    const manualCity = localStorage.getItem('stark_location');
    if (manualCity) {
        try {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${manualCity}&count=1&language=en&format=json`);
            const geoData = await geoRes.json();
            if (geoData.results && geoData.results.length > 0) {
                const loc = geoData.results[0];
                fetchWeather(loc.latitude, loc.longitude, loc.name);
                return;
            }
        } catch (e) { console.error("Geocoding failed", e); }
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
            (err) => fetchWeather(45.5017, -73.5673, "Montreal (Fallback)")
        );
    } else {
        fetchWeather(45.5017, -73.5673, "Montreal (Fallback)");
    }
}
initSensors();
