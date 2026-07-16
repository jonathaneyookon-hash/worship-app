# Scripture Presenter

An EasyWorship-style worship presentation app with **voice-controlled scripture search**,
**multi-version display**, and a **dual-window projector output** — built with Electron.

Tested and working: reference lookup ("John 3:16"), verse ranges ("1 Corinthians 13:4-7"),
loose spoken phrasing ("john chapter 3 verse 16"), and free-text phrase search
("and the darkness comprehended it not").

---

## 1. What's included

- `main.js` / `preload.js` — Electron main process: creates the **Control window**
  (search UI, on your laptop screen) and the **Live window** (full-text display, sent to
  the projector/second monitor).
- `db/` — the scripture engine:
  - `books.js` — book name/alias table used to parse references from typed or spoken text
  - `build-db.js` — one-time script that builds a local SQLite database (`bible.db`) with
    full-text search (FTS5), importing from `source-bible.db` (downloaded automatically —
    see note below, not committed to the repo since it's ~43MB)
  - `search.js` — the actual search logic (reference parsing + phrase search)

**Five free, public-domain versions are bundled and searchable out of the box:**
King James Version (KJV), American Standard Version (ASV), Bible in Basic English (BBE),
World English Bible (WEB), and Young's Literal Translation (YLT).

> **Licensing note:** the Bible text in all five versions is public domain. The
> combined database file itself comes from the open-source
> [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) project,
> whose repo is released under GPLv3. In practice this mainly matters if you redistribute
> the *database compilation* itself commercially — the biblical text underneath is free
> regardless. I'm not a lawyer, so if you ever plan to sell this app commercially (versus
> using it for your own church/ministry), it's worth a quick look at that repo's LICENSE
> file yourself before shipping.
- `src/control/` — the control window UI, restructured to mirror EasyWorship 7's actual
  layout:
  - **Preview / Live row** (top): select something and it loads into **Preview** first;
    click **Go Live** to push it to the projector — same explicit two-step flow EasyWorship
    uses, rather than instant-push.
  - **Resource Area** (bottom, collapsible): tabbed library — Scriptures is fully
    functional; Songs/Media/Presentations/Themes are shown as placeholder tabs for future
    expansion, matching EasyWorship's five-tab structure.
  - **Schedule** (right column of the Resource Area): a running set-list — add verses to
    build your service order, reorder with ▲/▼, click any item to reload it into Preview.
- `src/live/` — the projector output window (unchanged: large centered text, themeable background)
- `state.js` — shared schedule/preview/live state, single source of truth for both the
  desktop control window and the mobile Remote
- `server/` — the local network server for the mobile Remote (Express + WebSocket):
  - `index.js` — REST API (search, schedule, go-live) + WebSocket state broadcast
  - `public/` — the Remote's own mobile web UI (a standalone Bible search app in its own right)

Voice input uses the **Web Speech API**, built into Electron's Chromium engine — no extra
downloads, no local AI model, so it stays light on your 8GB RAM.

Everything is **fully local and offline** once built — scripture lookup hits your local
SQLite database, not the internet, so it works even without a connection.

---

## 2. Run it on your machine (development mode)

You'll need [Node.js](https://nodejs.org) installed (LTS version is fine).

```bash
cd worship-app
npm install
curl -o db/source-bible.db https://raw.githubusercontent.com/scrollmapper/bible_databases/2024/bible-sqlite.db
npm run build-db      # one-time: builds db/bible.db from source-bible.db
npm start              # launches the app
```

(On GitHub Actions this download happens automatically as part of the workflow — see `.github/workflows/build.yml`. You only need the `curl` line yourself when running locally, since `source-bible.db` is ~43MB and isn't committed to the repo to keep it lightweight.)

Click **"Open Live Display"** in the control window to open the projector window. If you
have a second monitor connected, it automatically opens full-screen there. With only one
monitor, it opens as a normal window you can drag to the projector output and full-screen
manually.

---

## 3. Building the distributable `.exe`

This has to be run **on a Windows machine** (or it will build a Mac/Linux app instead —
electron-builder targets whatever OS it's run on unless you're cross-compiling with Wine,
which is a much heavier setup). Since your dev machine is Windows, this is simple:

```bash
npm run dist:win
```

This produces an installer at `release/Scripture Presenter Setup 1.0.0.exe`. That single
file is what you hand to someone else — running it installs the app normally, with a
desktop shortcut, and it runs standalone (the SQLite database is bundled inside).

> Note: `better-sqlite3` is a native module. `npm install` downloads a prebuilt binary
> for your platform automatically (no compiler needed) as long as your Node version has a
> prebuilt release available — which it will for any recent Node LTS.

---

## 4. Adding more Bible versions

The bundled KJV, ASV, BBE, WEB, and YLT are all public-domain, so they ship free with no
API key, sourced from `db/source-bible.db`.

**If you want to add more free/public-domain versions later:**

1. Look for another public-domain translation, ideally already in a SQLite table with
   `(book, chapter, verse, text)` columns — the
   [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) project
   (check both its `2024` and current branches) has additional non-English public-domain
   translations (Spanish, French, etc.) in the same format, or you can adapt any Bible
   JSON/CSV dataset into the same shape.
2. Import that table into `db/source-bible.db` (or point `build-db.js` at a second source
   file — the script is written to ATTACH one source DB, but can be extended to attach more).
3. Add an entry to the `VERSIONS` array at the top of `db/build-db.js`:
   ```js
   { table: 't_yourversion', code: 'xyz', name: 'Your Version Name' },
   ```
4. Re-run `npm run build-db`.

Copyrighted versions (NIV, ESV, NLT) require a licensed API (like api.bible or
YouVersion's API) and can't be freely redistributed in the `.exe` — those would need a
live API call per lookup instead of local bundling, which is a different mode I can add
if you want it later.

---

## 5. How voice + phrase search works

Speaking (or typing) is first tested against the reference parser in `db/search.js`:
- Matches a Bible book name/alias at the start of the phrase (e.g. "john", "1 corinthians",
  "song of solomon")
- Then looks for chapter/verse numbers in flexible formats: "3:16", "3 16", "3:16-18", etc.

If nothing parses as a reference, it falls back to a full-text phrase search across the
selected version using SQLite FTS5 — so "and the darkness comprehended it not" finds
John 1:5 directly, ranked by relevance.

---

## 6. Remote (mobile companion)

The app runs a small local web server (on your own network, port 3939) so you can search
scripture and control the service from your phone — a real Bible search app in its own
right, not just a clicker.

**To connect:**
1. Click **Remote** in the desktop app's toolbar.
2. A URL and QR code appear — scan it, or type the URL into your phone's browser (phone
   must be on the same WiFi network as the computer running the app).
3. No install needed — it's just a web page, so it works on any phone (iPhone or Android).

**What it can do:**
- Full scripture search — reference or phrase, voice or typed, all 5 versions, exactly
  like the desktop.
- Add results to the **Schedule** (the same running set-list the desktop uses).
- **Go Live** directly from your phone.
- Everything stays in sync in real time — reorder the schedule on your phone, and the
  desktop updates instantly (and vice versa), over a WebSocket connection.
- A **live status banner** at the top shows what's currently on the projector.

**Install it as an app (no app store needed):** the Remote is a Progressive Web App —
after opening the URL, use your browser's "Add to Home Screen" option (Chrome on Android:
menu → "Install app" / "Add to Home Screen"; Safari on iOS: Share button → "Add to Home
Screen"). It'll appear as a real app icon and open full-screen with no browser bar,
without needing the Play Store, App Store, or any build pipeline.

**Architecture note, if you're extending this later:** `state.js` is the single source of
truth for schedule/preview/live, shared by both the Electron control window (via IPC) and
the Remote (via the same server's REST/WebSocket API in `server/index.js`). Any new
feature that touches schedule/live should go through `state.js` so the desktop and phone
never drift out of sync.



## 7. Background images

Click **Image…** next to the background swatches in the Live/Preview panel to pick any
local image file (PNG/JPG/WEBP/GIF). It's applied as a cover-fit background behind the
verse text on the projector output, with a dark overlay automatically added so text stays
readable regardless of the image. Click a solid-color swatch any time to switch back.

This works out of the box with no extra setup — it just uses Electron's built-in file
picker.

## 8. NDI output (optional — read this before enabling)

NDI lets other software (OBS, vMix, streaming tools) receive the Live window's output over
your network without a capture card. I've wired up the toggle and the code path, but I want
to be upfront: **this is meaningfully less reliable than everything else in this app**, for
reasons outside my control:

- It requires a native Node module (`grandiose`) that other projects using Electron have
  hit real packaging problems with — specifically, `electron-builder` chokes on symlinks
  in its package structure in some setups.
- It also requires installing NewTek's separate NDI Runtime on the machine, plus (on
  Windows) the Visual Studio 2013 C++ runtime — extra installs outside npm entirely.
- Given the native-module trouble we already hit with `better-sqlite3`, there's a real
  chance `grandiose` won't install cleanly without a full Visual Studio Build Tools setup,
  even on Node 20 LTS.

**Because of that, `grandiose` is deliberately NOT in `package.json`** — installing it
won't break your normal build. If you want to try NDI:

1. Install the [NDI Runtime](https://ndi.video/tools/ndi-core-suite/) for your OS.
2. `npm install grandiose`
3. Restart the app — the "NDI: Not installed" button in the toolbar should change to
   "NDI: Off" (clickable) once `grandiose` loads successfully.
4. Click it to start sending. It captures the Live window at 15fps (scripture slides are
   mostly static, so this keeps CPU load low) and sends it as an NDI source named
   "Scripture Presenter" on your network.

**If `npm install grandiose` fails or it doesn't work reliably once running:** the
practical alternative that gets you the same real-world outcome — getting the Live output
into OBS or a streaming tool — with zero native-module risk is **OBS's built-in Window
Capture or Display Capture** source, pointed at the Live window or the monitor it's on.
No NDI, no extra installs, no build fragility. Given your hardware history, I'd genuinely
lean toward recommending that route unless you specifically need NDI's networked
(non-capture-card) delivery to another machine.


## 9. Known constraints / next steps

- No song/lyrics module yet — this build is scripture-only per your request. EasyWorship's
  song presentation mode could be added the same way (a `songs` table + a second search mode).
- Single Windows target for now; the same Electron project can also build macOS/Linux
  installers by running `npm run dist` on those platforms respectively.
- Background images are static only for now (no looping video backgrounds yet).
