# Scripture Presenter

Scripture Presenter is a free, Windows-focused worship presentation system inspired by the workflow of EasyWorship. It combines Bible presentation, service ordering, songs/lyrics, local media, simple presentations, themes, live/preview output, a dedicated stage display, mobile Remote control and optional NDI output.

## Current feature set

### Bible
- Offline SQLite Bible search
- Reference and phrase search
- Book autocomplete
- Search across installed translations
- Global single-translation model: changing the selected translation automatically re-resolves the current Live, Preview and scheduled Scriptures
- Public-domain/free translation pack installer
- Voice search

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

### NDI
- Optional NDI sender integration
- Live Display capture as NDI video
- Runtime status and graceful fallback when NDI is unavailable

## Bible packs
The repository does not bundle copyrighted translations without permission. Use `npm run install-bible-packs` to download supported public-domain/free packs, then `npm run build-db` to rebuild the local database.

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
