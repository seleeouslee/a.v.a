# A.V.A.

A static website built with HTML, CSS, and JavaScript. No build step or package installation is required.

## Structure

```text
index.html       Page structure
css/styles.css   Styles and layout
js/background.js Canvas character animation
js/theme.js      Theme colors
js/windows.js    Panel dragging, snapping, and placement
js/clock.js      Clock and date
js/browser.js    Embedded browser navigation
js/weather.js    Location and weather
js/settings.js   Preferences and saved configuration
js/notion.js     Notion task synchronization
js/media.js      Image and video search
js/twitch.js     Twitch stream and chat panel
js/llm.js        AI model requests
js/commands.js   Typed and spoken command routing
js/voice.js      Speech recognition and spoken replies
```

The scripts use classic browser script tags, so opening `index.html` directly still works. Keep the script order in `index.html`: feature helpers and shared settings load before voice input is initialized. Cross-feature dependencies are noted at the top of the relevant files. No bundler is required.

## Run locally

Open `index.html` in your browser, or run a local server from this directory:

```powershell
python -m http.server 8000
```

Then open http://localhost:8000. Press Ctrl+C to stop the server.

## GitHub Pages

Keep `index.html`, `css/`, and `js/` together at the root of the configured Pages publishing source. Commit and push all three to the branch used by the existing deployment. The relative asset URLs work at https://seleeouslee.github.io/a.v.a/ without changing the Pages URL or adding a build step.

## Integrations

### Twitch

Type `open Twitch channel twitchdev` or say **Ava, open Twitch channel twitchdev** after activating voice. Replace `twitchdev` with the channel's login name. `open browser twitch twitchdev` also works. Use `open Twitch` to open the empty panel, enter a channel name or `https://www.twitch.tv/channel`, and select **WATCH**. Press Play inside the player to start playback.

The panel is draggable and resizable. `move Twitch top left` positions it; `close Twitch` or its **CLOSE** button unloads the stream and chat to stop playback. No Twitch API key is needed for these embeds.

Use GitHub Pages or the local HTTP server above; Twitch embeds do not work when opening `index.html` as a local file. The hosting domain is set automatically from the current URL. Playback, channel availability, and chat login are handled by Twitch. See the official [player](https://dev.twitch.tv/docs/embed/video-and-clips/) and [chat](https://dev.twitch.tv/docs/embed/chat/) documentation.

Run the Twitch command checks with `node --test tests/twitch.test.cjs`.

### Other services

Open settings with **Ctrl+A+M** to configure the model endpoint, model name, location, theme, and optional Notion integration. AI chat requires a running model server; the defaults are `http://localhost:11434/v1/chat/completions` and `llama3`. GitHub Pages serves the website files, while integrations still depend on their configured services and browser permissions.
