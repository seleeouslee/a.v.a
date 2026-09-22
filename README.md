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
js/transit-schedule.js STM command parsing and schedule calculations
js/transit.js    STM panel, data loading, and spoken answers
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

Keep `index.html`, `css/`, `js/`, and `data/` together at the root of the configured Pages publishing source. Commit and push them to the branch used by the existing deployment. The relative asset URLs work at https://seleeouslee.github.io/a.v.a/ without changing the Pages URL or adding a build step.

## Integrations

### Twitch

Voice commands accept **AVA** as the wake word (including `A.V.A.` and `E.V.A.`). Either prefix also works when typing commands.

Type `open Twitch channel twitchdev` or say **Ava, open Twitch channel twitchdev** after activating voice. Replace `twitchdev` with the channel's login name. `open browser twitch twitchdev` also works. Use `open Twitch` to open the empty panel, enter a channel name or `https://www.twitch.tv/channel`, and select **WATCH**. Press Play inside the player to start playback.

The panel is draggable and resizable. The stream and chat fill the panel side by side when its content is at least 700 pixels wide. In narrower panels, chat stacks below the stream and the content scrolls, keeping the video at Twitch's required minimum of 400 by 300 pixels. Resizing does not reload playback. `move Twitch top left` positions it; `close Twitch` or its **CLOSE** button unloads the stream and chat to stop playback. No Twitch API key is needed for these embeds.

Use GitHub Pages or the local HTTP server above; Twitch embeds do not work when opening `index.html` as a local file. The hosting domain is set automatically from the current URL. Playback, channel availability, and chat login are handled by Twitch. See the official [player](https://dev.twitch.tv/docs/embed/video-and-clips/) and [chat](https://dev.twitch.tv/docs/embed/chat/) documentation.

Run the Twitch command checks with `node --test tests/twitch.test.cjs`.

### STM bus schedules and metro frequencies

Say **AVA** or **EVA**, followed by a question like:

- `What's the next STM bus 24 at stop 52819 toward west?`
- `What's the next metro at Berri-UQAM toward Angrignon?`
- `Next metro orange line at Jean-Talon toward Montmorency`
- `Open STM` to enter a route, stop/station, and direction in the panel.
- `Close STM` or `move STM top left` to manage the panel.

Use the five-digit code on the bus stop sign. Specify the metro terminus as the direction. Missing or ambiguous information produces a clarification instead of guessing a stop. Accents and hyphens in station names are optional. Bus direction is optional when the stop code identifies the relevant boarding point; each result states its destination.

Bus answers list the next three **published departures**, in Montréal time, including service-calendar exceptions and overnight trips. They are not live predictions. Metro answers show STM's published typical frequency ranges during service hours, **not exact next-train times**. STM describes its GTFS metro times as indicative and unsuitable for metro timetable apps, so this app does not export or calculate departures from those metro trip times.

Data source: [Société de transport de Montréal](https://www.stm.info/fr/a-propos/developpeurs), adapted under [CC BY 4.0 / STM terms](https://www.stm.info/fr/a-propos/developpeurs/condition-dutilisation). A.V.A. is not affiliated with STM. The current bus data covers June 15–October 25, 2026. Metro frequency ranges were checked September 22, 2026 and require review by October 25. Expired data is rejected rather than presented as current.

The site loads a small index and only the requested route's compressed timetable. All files are served from `data/stm/`, so no API key, external CORS proxy, or backend is needed. Use GitHub Pages or `python -m http.server 8000`; direct `file://` access cannot load schedule files. A browser with `DecompressionStream` support is needed for bus schedules.

To refresh bus data, run `python scripts/update_stm.py`, then commit and push the updated `data/stm/` files. Alternatively, supply an official downloaded feed using `--zip path/to/gtfs_stm.zip`. The script retains versioned older route files to avoid deleting anything unexpectedly. Metro ranges in `data/stm/metro-frequencies.json` must be checked against their linked STM pages and their review date updated separately; downloading a bus feed does not validate metro frequencies.

Run `node --test tests/*.test.cjs` for command and schedule checks. No npm installation is required.

### Other services

Open settings with **Ctrl+A+M** to configure the model endpoint, model name, location, theme, and optional Notion integration. AI chat requires a running model server; the defaults are `http://localhost:11434/v1/chat/completions` and `llama3`. GitHub Pages serves the website files, while integrations still depend on their configured services and browser permissions.
