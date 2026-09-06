const fs = require('fs');
const path = require('path');
const root = process.cwd();
function write(rel, content) { fs.writeFileSync(path.join(root, rel), content); }

write('state.js', `// Shared presentation state used by the desktop controller and mobile Remote.\nconst { EventEmitter } = require('events');\n\nclass AppState extends EventEmitter {\n  constructor() {\n    super();\n    this.schedule = [];\n    this.preview = null;\n    this.live = null;\n    this.output = 'live';\n    this.selectedVersion = 'kjv';\n    this._nextId = 1;\n  }\n  addToSchedule(item) {\n    if (!item || !item.reference || !item.text) return null;\n    const entry = { id: this._nextId++, ...item, version: this.selectedVersion };\n    this.schedule.push(entry); this._emitChange(); return entry;\n  }\n  removeFromSchedule(id) { this.schedule = this.schedule.filter(i => i.id !== Number(id)); this._emitChange(); }\n  moveInSchedule(id, direction) { const i=this.schedule.findIndex(x=>x.id===Number(id)); if(i<0)return; const n=i+Number(direction); if(n<0||n>=this.schedule.length)return; [this.schedule[i],this.schedule[n]]=[this.schedule[n],this.schedule[i]]; this._emitChange(); }\n  setPreview(item) { this.preview = item ? {...item, version:this.selectedVersion} : null; this._emitChange(); }\n  goLive(item) { const next=item||this.preview; if(!next)return; this.live={...next,version:this.selectedVersion}; this.preview={...this.live}; this.output='live'; this._emitChange(); this.emit('display',this.snapshot()); }\n  setVersion(version, resolveReference) {\n    if(!version)return; this.selectedVersion=String(version);\n    const resolve=typeof resolveReference==='function'?resolveReference:null;\n    const resolveItem=(item)=>{\n      if(!item)return item; if(!resolve)return {...item,version:this.selectedVersion};\n      const rows=resolve(item.reference,this.selectedVersion);\n      if(!rows||!rows.length)return {...item,version:this.selectedVersion};\n      return {...item,version:this.selectedVersion,text:rows.map(r=>r.text).join(' ')};\n    };\n    this.schedule=this.schedule.map(resolveItem); this.preview=resolveItem(this.preview); this.live=resolveItem(this.live);\n    this._emitChange(); if(this.live)this.emit('display',this.snapshot());\n  }\n  blackout(){this.output='black';this._emitChange();this.emit('display',this.snapshot());}\n  clearLive(){this.live=null;this.output='clear';this._emitChange();this.emit('display',this.snapshot());}\n  restoreLive(){if(!this.live)return;this.output='live';this._emitChange();this.emit('display',this.snapshot());}\n  snapshot(){return {schedule:this.schedule,preview:this.preview,live:this.live,output:this.output,selectedVersion:this.selectedVersion};}\n  _emitChange(){this.emit('change',this.snapshot());}\n}\nmodule.exports=new AppState();\n`);

let main = fs.readFileSync(path.join(root,'main.js'),'utf8');
main = main.replace("ipcMain.handle('state:get', () => state.snapshot());", "ipcMain.handle('state:get', () => state.snapshot());\nipcMain.handle('state:set-version', (event, version) => {\n  const engine = getSearchEngine();\n  if (!engine) return false;\n  state.setVersion(version, (reference, selected) => { const ref = engine.parseReference(reference); return ref ? engine.getByReference(ref, selected) : []; });\n  return true;\n});");
write('main.js',main);

let preload = fs.readFileSync(path.join(root,'preload.js'),'utf8');
preload = preload.replace("getState: () => ipcRenderer.invoke('state:get'),", "getState: () => ipcRenderer.invoke('state:get'),\n  setVersion: (version) => ipcRenderer.invoke('state:set-version', version),");
write('preload.js',preload);

let server = fs.readFileSync(path.join(root,'server/index.js'),'utf8');
server = server.replace("app.get('/api/state', (req, res) => res.json(state.snapshot()));", "app.get('/api/state', (req, res) => res.json(state.snapshot()));\n  app.post('/api/version', (req, res) => {\n    const version = String(req.body?.version || '');\n    if (!version) return res.status(400).json({ error: 'version is required' });\n    const refResolver = (reference, selected) => { const ref = search.parseReference(reference); return ref ? search.getByReference(ref, selected) : []; };\n    state.setVersion(version, refResolver);\n    return res.json({ ok: true, selectedVersion: state.snapshot().selectedVersion });\n  });");
write('server/index.js',server);

let remote = fs.readFileSync(path.join(root,'server/public/remote.js'),'utf8');
remote = remote.replace("versionSelect.addEventListener('change', () => { currentVersion = versionSelect.value; });", "versionSelect.addEventListener('change', async () => { currentVersion = versionSelect.value; try { await api('/api/version', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({version:currentVersion}) }); } catch (_) {} });");
remote = remote.replace("function applyState(snapshot) { renderSchedule(snapshot.schedule); renderLive(snapshot); }", "function applyState(snapshot) {\n  if (snapshot.selectedVersion) { currentVersion = snapshot.selectedVersion; if (versionSelect.value !== currentVersion) versionSelect.value = currentVersion; }\n  renderSchedule(snapshot.schedule); renderLive(snapshot);\n}");
remote = remote.replace("if (versions.length) currentVersion = versions[0].code;", "if (versions.length) { currentVersion = versions[0].code; versionSelect.value = currentVersion; }");
write('server/public/remote.js',remote);

let control = fs.readFileSync(path.join(root,'src/control/control.js'),'utf8');
control = control.replace("versionSelect.addEventListener('change', () => { currentVersion = versionSelect.value; });", "versionSelect.addEventListener('change', () => { currentVersion = versionSelect.value; if (window.scriptureAPI.setVersion) window.scriptureAPI.setVersion(currentVersion); });");
control = control.replace("currentVersion = versions[0].code;", "currentVersion = versions[0].code; if (window.scriptureAPI.setVersion) window.scriptureAPI.setVersion(currentVersion);");
write('src/control/control.js',control);

let html = fs.readFileSync(path.join(root,'server/public/index.html'),'utf8');
html = html.replace('All versions','Search all versions');
write('server/public/index.html',html);

// Make the existing all-version search explicitly a search tool; Live always follows selectedVersion.
let remoteCss = fs.readFileSync(path.join(root,'server/public/remote.css'),'utf8');
write('server/public/remote.css', remoteCss);

console.log('Translation upgrade applied: global selected translation, live/schedule re-resolution, Remote + desktop sync.');
