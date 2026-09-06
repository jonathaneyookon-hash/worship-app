const { app, BrowserWindow, ipcMain, screen, Menu, dialog } = require('electron');
const path = require('path');
const os = require('os');
const { pathToFileURL } = require('url');
const ndi = require('./ndi');
const state = require('./state');
const { startServer } = require('./server');

const SERVER_PORT = 3939;
let remoteInfo = null;
let controlWindow = null;
let liveWindow = null;
let currentTheme = { type: 'color', background: '#000000' };

let searchEngine = null;
let dbLoadError = null;
function getSearchEngine() {
  if (!searchEngine) {
    try { searchEngine = require('./db/search'); }
    catch (e) {
      dbLoadError = e.message;
      console.error('Bible database not found. Run: node db/build-db.js', e);
    }
  }
  return searchEngine;
}

function getLanIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) return iface.address;
    }
  }
  return null;
}

function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1050, minHeight: 700,
    title: 'Scripture Presenter — Control',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  controlWindow.loadFile(path.join(__dirname, 'src/control/index.html'));
  controlWindow.on('closed', () => {
    controlWindow = null;
    if (liveWindow && !liveWindow.isDestroyed()) liveWindow.close();
  });
}

function createLiveWindow() {
  const displays = screen.getAllDisplays();
  const external = displays.find((d) => d.bounds.x !== 0 || d.bounds.y !== 0) || displays[0];
  liveWindow = new BrowserWindow({
    x: external.bounds.x, y: external.bounds.y,
    width: external.bounds.width, height: external.bounds.height,
    fullscreen: displays.length > 1, frame: displays.length === 1,
    backgroundColor: '#000000',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  liveWindow.loadFile(path.join(__dirname, 'src/live/index.html'));
  liveWindow.webContents.once('did-finish-load', () => {
    liveWindow.webContents.send('live:theme', currentTheme);
    liveWindow.webContents.send('live:display', state.snapshot());
  });
  liveWindow.on('closed', () => { liveWindow = null; });
}

state.on('display', (snapshot) => {
  if (liveWindow && !liveWindow.isDestroyed()) liveWindow.webContents.send('live:display', snapshot);
});
state.on('change', (snapshot) => {
  if (controlWindow && !controlWindow.isDestroyed()) controlWindow.webContents.send('state:update', snapshot);
});

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  createControlWindow();
  try {
    const engine = getSearchEngine() || {
      listVersions: () => [], search: () => ({ error: 'DB not built' }),
      parseReference: () => null, getByReferenceAllVersions: () => [],
    };
    await startServer({ state, search: engine, port: SERVER_PORT });
    const ip = getLanIp();
    if (ip) {
      const url = `http://${ip}:${SERVER_PORT}`;
      let qrDataUrl = null;
      try { qrDataUrl = await require('qrcode').toDataURL(url, { margin: 1, width: 240 }); } catch (_) {}
      remoteInfo = { url, qrDataUrl, host: ip, port: SERVER_PORT };
    }
  } catch (e) { console.error('Could not start Remote server:', e); }

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createControlWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('search:query', (event, { query, version }) => {
  const engine = getSearchEngine();
  if (!engine) return { error: 'Bible database not built yet. Run: node db/build-db.js' };
  try { return engine.search(query, version); } catch (e) { return { error: e.message }; }
});
ipcMain.handle('search:reference-all-versions', (event, { query }) => {
  const engine = getSearchEngine();
  if (!engine) return { error: 'Bible database not built yet.' };
  const ref = engine.parseReference(query);
  if (!ref) return { error: 'Could not parse a reference from that input.' };
  return { reference: ref, versions: engine.getByReferenceAllVersions(ref) };
});
ipcMain.handle('search:versions', () => { const e = getSearchEngine(); return e ? e.listVersions() : []; });
ipcMain.handle('search:books', () => { try { return require('./db/books').map(([_, name]) => name); } catch (_) { return []; } });
ipcMain.handle('diagnostics:db-error', () => dbLoadError);

ipcMain.handle('state:get', () => state.snapshot());
ipcMain.handle('schedule:add', (event, item) => state.addToSchedule(item));
ipcMain.handle('schedule:remove', (event, id) => { state.removeFromSchedule(id); return true; });
ipcMain.handle('schedule:move', (event, { id, direction }) => { state.moveInSchedule(id, direction); return true; });
ipcMain.handle('preview:set', (event, item) => { state.setPreview(item); return true; });
ipcMain.handle('live:go', (event, item) => { state.goLive(item); return true; });
ipcMain.handle('live:black', () => { state.blackout(); return true; });
ipcMain.handle('live:restore', () => { state.restoreLive(); return true; });
ipcMain.handle('live:clear-state', () => { state.clearLive(); return true; });

ipcMain.on('live:open', () => { if (!liveWindow) createLiveWindow(); else liveWindow.focus(); });
ipcMain.on('live:set-theme', (event, theme) => {
  currentTheme = theme || currentTheme;
  if (!liveWindow) createLiveWindow();
  else liveWindow.webContents.send('live:theme', currentTheme);
});

ipcMain.handle('theme:select-image', async () => {
  const result = await dialog.showOpenDialog(controlWindow, {
    title: 'Choose a background image', properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
  });
  if (result.canceled || !result.filePaths.length) return null;
  return { path: result.filePaths[0], url: pathToFileURL(result.filePaths[0]).href };
});

ipcMain.handle('ndi:status', () => ndi.status());
ipcMain.handle('ndi:start', async () => {
  if (!liveWindow) createLiveWindow();
  try { await ndi.start(liveWindow, 'Scripture Presenter'); return ndi.status(); }
  catch (e) { return { ...ndi.status(), error: e.message }; }
});
ipcMain.handle('ndi:stop', () => { ndi.stop(); return ndi.status(); });
ipcMain.handle('remote:info', () => remoteInfo);
