# A.V.A.

A static website built with HTML, CSS, and JavaScript. No build step or package installation is required.

## Structure

```text
index.html       Page structure
css/styles.css   Styles and layout
js/app.js        Application behavior and integrations
```

## Run locally

Open `index.html` in your browser, or run a local server from this directory:

```powershell
python -m http.server 8000
```

Then open http://localhost:8000. Press Ctrl+C to stop the server.

## GitHub Pages

Keep `index.html`, `css/`, and `js/` together at the root of the configured Pages publishing source. Commit and push all three to the branch used by the existing deployment. The relative asset URLs work at https://seleeouslee.github.io/a.v.a/ without changing the Pages URL or adding a build step.

## Integrations

Open settings with **Ctrl+A+M** to configure the model endpoint, model name, location, theme, and optional Notion integration. AI chat requires a running model server; the defaults are `http://localhost:11434/v1/chat/completions` and `llama3`. GitHub Pages serves the website files, while integrations still depend on their configured services and browser permissions.
