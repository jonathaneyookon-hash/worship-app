const { app, BrowserWindow, ipcMain, screen, Menu, dialog } = require('electron');
const path = require('path');
const os = require('os');
const { pathToFileURL } = require('url');
const ndi = require('./ndi');
const state = require('./state');
const { startServer } = require('./server');

const SERVER_PORT = 3939;
let remoteInfo = null; // { url, qrDataUrl } — filled in once the server starts

let controlWindow = null;
let liveWindow = null;
let currentTheme = null; // persisted so it re-applies whenever the Live window (re)opens

// Lazily require search.js so a missing bible.db doesn't crash app startup;
// we show a friendly "run the import script" message in the UI instead.
let searchEngine = null;
let dbLoadError = null;
function getSearchEngine() {
  if (!searchEngine) {
    try {
      searchEngine = require('./db/search');
    } catch (e) {
      dbLoadError = e.message;
      console.error('Bible database not found. Run: node db/build-db.js', e);
    }
  }
  return searchEngine;
}

function getLanIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}

function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Scripture Presenter — Control',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  controlWindow.loadFile(path.join(__dirname, 'src/control/index.html'));
  controlWindow.webContents.openDevTools({ mode: 'detach' });
  controlWindow.on('closed', () => {
    controlWindow = null;
    if (liveWindow) liveWindow.close();
  });
}

function createLiveWindow() {
  const displays = screen.getAllDisplays();
  // Prefer a second monitor (projector) if one is connected; otherwise open
  // a normal window on the primary display that the user can drag over.
  const external = displays.find((d) => d.bounds.x !== 0 || d.bounds.y !== 0) || displays[displays.length - 1];

  liveWindow = new BrowserWindow({
    x: external.bounds.x,
    y: external.bounds.y,
    width: external.bounds.width,
    height: external.bounds.height,
    fullscreen: displays.length > 1,
    frame: displays.length === 1,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  liveWindow.loadFile(path.join(__dirname, 'src/live/index.html'));
  liveWindow.webContents.once('did-finish-load', () => {
    if (currentTheme) liveWindow.webContents.send('live:theme', currentTheme);
    if (state.live) liveWindow.webContents.send('live:update', state.live);
  });
  liveWindow.on('closed', () => { liveWindow = null; });
}

// ---- Shared state -> push effects to the actual windows ----
// This is the one place that turns "the live item changed" into an actual
// projector update, regardless of whether the change came from the desktop
// control window or a phone on the Remote.
state.on('live', (item) => {
  if (!liveWindow) return;
  if (item) liveWindow.webContents.send('live:update', item);
  else liveWindow.webContents.send('live:clear');
});

// Keep the desktop control window's UI in sync with state changes that may
// have come from a phone Remote (or from itself — harmless either way).
state.on('change', (snapshot) => {
  if (controlWindow) controlWindow.webContents.send('state:update', snapshot);
});

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  createControlWindow();

  try {
    const engine = getSearchEngine() || {
      listVersions: () => [],
      search: () => ({ error: 'DB not built' }),
      parseReference: () => null,
      getByReferenceAllVersions: () => [],
    };
    await startServer({ state, search: engine, port: SERVER_PORT });
    const ip = getLanIp();
    if (ip) {
      const url = `http://${ip}:${SERVER_PORT}`;
      let qrDataUrl = null;
      try {
        const qrcode = require('qrcode');
        qrDataUrl = await qrcode.toDataURL(url);
      } catch (e) { /* qrcode not installed — url text still works fine */ }
      remoteInfo = { url, qrDataUrl };
    }
  } catch (e) {
    console.error('Could not start Remote server:', e.message);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createControlWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---- IPC: search ----
ipcMain.handle('search:query', (event, { query, version }) => {
  const engine = getSearchEngine();
  if (!engine) return { error: 'Bible database not built yet. Run: node db/build-db.js' };
  try {
    return engine.search(query, version);
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('search:reference-all-versions', (event, { query }) => {
  const engine = getSearchEngine();
  if (!engine) return { error: 'Bible database not built yet. Run: node db/build-db.js' };
  const ref = engine.parseReference(query);
  if (!ref) return { error: 'Could not parse a reference from that input.' };
  return { reference: ref, versions: engine.getByReferenceAllVersions(ref) };
});

ipcMain.handle('search:versions', () => {
  const engine = getSearchEngine();
  if (!engine) return [];
  return engine.listVersions();
});

ipcMain.handle('search:books', () => {
  try {
    return require('./db/books').map(([abbrev, name]) => name);
  } catch (e) {
    return [];
  }
});

ipcMain.handle('diagnostics:db-error', () => dbLoadError);

// ---- IPC: shared state (schedule / preview / live) ----
ipcMain.handle('state:get', () => state.snapshot());
ipcMain.handle('schedule:add', (event, item) => state.addToSchedule(item));
ipcMain.handle('schedule:remove', (event, id) => { state.removeFromSchedule(id); return true; });
ipcMain.handle('schedule:move', (event, { id, direction }) => { state.moveInSchedule(id, direction); return true; });
ipcMain.handle('preview:set', (event, item) => { state.setPreview(item); return true; });
ipcMain.handle('live:go', (event, item) => { state.goLive(item); return true; });
ipcMain.handle('live:clear-state', () => { state.clearLive(); return true; });

// ---- IPC: live window control ----
ipcMain.on('live:open', () => {
  if (!liveWindow) createLiveWindow();
  else liveWindow.focus();
});

ipcMain.on('live:set-theme', (event, theme) => {
  currentTheme = theme;
  if (!liveWindow) {
    createLiveWindow();
    return; // did-finish-load handler above will apply currentTheme once ready
  }
  liveWindow.webContents.send('live:theme', theme);
});

// ---- IPC: background image ----
ipcMain.handle('theme:select-image', async () => {
  const result = await dialog.showOpenDialog(controlWindow, {
    title: 'Choose a background image',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  return { path: filePath, url: pathToFileURL(filePath).href };
});

// ---- IPC: NDI output (optional, requires `grandiose` — see README) ----
ipcMain.handle('ndi:status', () => ({ available: ndi.isAvailable() }));

ipcMain.handle('ndi:start', async () => {
  if (!liveWindow) createLiveWindow();
  try {
    await ndi.start(liveWindow, 'Scripture Presenter');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('ndi:stop', () => {
  ndi.stop(liveWindow);
  return { ok: true };
});

// ---- IPC: Remote connection info (URL + QR code for the control window) ----
ipcMain.handle('remote:info', () => remoteInfo);
