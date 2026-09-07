# Scripture Remote (mobile app)

A dedicated Android/iOS app for controlling Scripture Presenter, built the
same way as [PT Remote](https://github.com/jonathaneyookon-hash/remote-pc-app)
(Capacitor + React + Vite) — but LAN-only, since Scripture Presenter's Remote
server already runs on the same network as the phone. There's no relay
server, pairing secret, or WebRTC here; those solve "control my PC from
anywhere on the internet," which isn't this app's job. This just needs to
find the desktop app on the same Wi-Fi and talk to its existing HTTP/WebSocket
API.

## What it does

- **Add a connection** by scanning the QR code shown in the desktop app's
  control room (Remote panel), or by typing in the address shown below it
  (e.g. `http://192.168.1.50:3939`).
- Saves connections locally (`@capacitor/preferences`) so you don't have to
  re-scan every service — same pattern as PT Remote's saved PC list.
- **Forces landscape orientation** the moment you connect, and releases it
  again when you back out — same `@capacitor/screen-orientation` lock/unlock
  pattern PT Remote's RemoteControl screen uses.
- Full control surface: scripture search (single version or all versions),
  add-to-schedule / go-live, service order with reorder and prev/next
  stepping, black/restore/clear, transitions, stage mode, quick-add for
  songs and presentation slides, and theme quick-select — everything the web
  Remote has, native.

## Project layout

```
mobile-app/
  src/
    App.jsx                 switches between the connections list and the remote screen
    storage.js               saved-connections persistence (Preferences)
    ConnectionsScreen.jsx     list of saved connections + "Add" flow
    AddConnectionModal.jsx    QR scan (barcode-scanning) or manual address entry
    Remote.jsx                the actual controller: landscape lock, WebSocket sync, all controls
  resources/icon.png          1024x1024 master app icon
  capacitor.config.json
```

## Building it

This was written and verified (`npm install && npm run build`) in a sandbox
without Android/iOS tooling, so the web bundle is confirmed to compile
cleanly — but turning it into an installable app needs a real machine with
Android Studio (and/or Xcode for iOS). From this folder:

```bash
npm install

# Add the native platform (one-time)
npx cap add android
# npx cap add ios      # macOS + Xcode only

# Generate a full icon set (adaptive icons, all densities) from resources/icon.png
npx @capacitor/assets generate --android
# npx @capacitor/assets generate --ios

# Build the web bundle and copy it into the native project
npm run build
npx cap sync android

# Open in Android Studio to run on a device/emulator or build an APK
npx cap open android
```

In Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)** gives you
a sideloadable APK. For a real release build (signed, for the Play Store or
wider distribution), use **Build → Generate Signed Bundle / APK** instead.

### Dev mode (fastest way to test changes)

```bash
npm run dev
```

This starts a Vite dev server. With the phone and computer on the same
Wi-Fi, you can point the Capacitor dev build at it, or just open the printed
URL in the phone's browser to test the UI logic before doing a native build
(orientation lock and the QR scanner won't work in a plain browser tab,
everything else will).
