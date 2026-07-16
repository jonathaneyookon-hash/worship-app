const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('scriptureAPI', {
  // Search
  search: (query, version) => ipcRenderer.invoke('search:query', { query, version }),
  searchAllVersions: (query) => ipcRenderer.invoke('search:reference-all-versions', { query }),
  listVersions: () => ipcRenderer.invoke('search:versions'),
  listBooks: () => ipcRenderer.invoke('search:books'),
  getDbError: () => ipcRenderer.invoke('diagnostics:db-error'),

  // Shared state (schedule / preview / live) — same state a phone Remote uses
  getState: () => ipcRenderer.invoke('state:get'),
  addToSchedule: (item) => ipcRenderer.invoke('schedule:add', item),
  removeFromSchedule: (id) => ipcRenderer.invoke('schedule:remove', id),
  moveSchedule: (id, direction) => ipcRenderer.invoke('schedule:move', { id, direction }),
  setPreview: (item) => ipcRenderer.invoke('preview:set', item),
  goLive: (item) => ipcRenderer.invoke('live:go', item),
  clearLiveState: () => ipcRenderer.invoke('live:clear-state'),
  onStateUpdate: (callback) => ipcRenderer.on('state:update', (e, snapshot) => callback(snapshot)),

  // Live window management
  openLiveWindow: () => ipcRenderer.send('live:open'),
  setLiveTheme: (theme) => ipcRenderer.send('live:set-theme', theme),
  selectBackgroundImage: () => ipcRenderer.invoke('theme:select-image'),

  // NDI (optional)
  ndiStatus: () => ipcRenderer.invoke('ndi:status'),
  ndiStart: () => ipcRenderer.invoke('ndi:start'),
  ndiStop: () => ipcRenderer.invoke('ndi:stop'),

  // Mobile Remote connection info
  getRemoteInfo: () => ipcRenderer.invoke('remote:info'),

  // Live window <- main
  onLiveUpdate: (callback) => ipcRenderer.on('live:update', (e, payload) => callback(payload)),
  onLiveClear: (callback) => ipcRenderer.on('live:clear', () => callback()),
  onLiveTheme: (callback) => ipcRenderer.on('live:theme', (e, theme) => callback(theme)),
});
