# Scripture Presenter

Scripture Presenter is a free, Windows-focused worship presentation system inspired by the workflow of EasyWorship. It combines Bible presentation, service ordering, songs/lyrics, local media, simple presentations, themes, live/preview output, a dedicated stage display, mobile Remote control and optional NDI output.

## Current feature set

### Bible
- Offline SQLite Bible search
- Reference and phrase search
- Book autocomplete
- Search across every translation installed in the local database
- Global single-translation model: changing the selected translation automatically re-resolves the current Live, Preview and scheduled Scriptures
- Automatic Bible pack downloader from an open/public-domain machine-readable Bible dataset
- 33 downloadable Bible versions across 22 languages are configured by the installer
- Voice search
- Full scrollable Bible browser (EasyWorship-style): a persistent Book +
  Chapter view covering Genesis 1 through Revelation's last chapter, with
  Prev/Next chapter navigation that rolls across book boundaries. Typing a
  direct reference (e.g. "John 3:16") jumps the browser to that whole
  chapter with the verse highlighted, rather than only showing the single
  isolated verse.

### Presentation
- Preview and Live panes
- Full-screen Live Display on a second monitor
- Black, Clear and Restore controls
- Fade, Cut and Slide presentation modes
- Color and image backgrounds
- Scripture, song, presentation and media service items
- Keyboard shortcuts: F5 Live, F6 Black, F7 Clear, Esc Restore, Up/Down service navigation

### Service management
- Service name
- Add/reorder/remove service items
- Save and load services as JSON files
- Mixed service order: Scripture + Song + Media + Presentation

### Media and slides
- Local image/video selection
- Live image/video playback
- Simple title/body presentation slides
- Song and lyric service items

### Stage Display
- Dedicated operator Stage Display window
- Current live item
- Next service item
- Clock

### Remote
- Mobile/PWA Remote over the local Wi-Fi network
- QR access from the desktop
- Real-time WebSocket state synchronization
- Scripture search
- Translation switching
- Search across versions
- Go Live
- Service order navigation
- Previous/Next
- Black/Clear/Restore
- Transition and stage-mode controls
- Voice search
- Songs, presentation slides, and theme quick-select
- A native mobile app (`mobile-app/`) with the same controls, QR/manual
  pairing, a saved-connections list, and a forced-landscape control layout —
  see [`mobile-app/README.md`](mobile-app/README.md)

### NDI
- Optional NDI sender integration
- Live Display capture as NDI video
- Runtime status and graceful fallback when NDI is unavailable

## Bible packs
Run the installer once while connected to the internet:

```bash
npm install
npm run install-bible-packs
npm run build-db
```

The installer downloads open/public-domain Bible data into `db/source-bible.db`. The database builder automatically discovers the downloaded `t_*` translation tables, imports them into the searchable SQLite database and rebuilds the FTS5 search index. No application-code change is required when a supported pack is added.

The configured dataset includes English, Arabic, Chinese, Czech, Danish, Dutch, Esperanto, French, German, Greek, Hebrew, Hungarian, Italian, Latin, Norwegian, Polish, Portuguese, Romanian, Russian, Swedish, Ukrainian and Vietnamese versions.

## Development

```bash
npm install
npm run install-bible-packs
npm run build-db
npm start
```

Build the Windows installer with:

```bash
npm run dist:win
```

The application can operate offline after the Bible database and any local media have been installed. The Remote requires the PC and phone/tablet to be on the same local network.
