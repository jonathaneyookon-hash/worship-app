const searchInput = document.getElementById('searchInput');
const micBtn = document.getElementById('micBtn');
const micStatus = document.getElementById('micStatus');
const versionSelect = document.getElementById('versionSelect');
const multiVersionToggle = document.getElementById('multiVersionToggle');
const resultsMeta = document.getElementById('resultsMeta');
const resultsEl = document.getElementById('results');
const connDot = document.getElementById('connDot');
const liveBanner = document.getElementById('liveBanner');
const liveBannerText = document.getElementById('liveBannerText');
const outputLabel = document.getElementById('outputLabel');
const scheduleToggle = document.getElementById('scheduleToggle');
const scheduleCount = document.getElementById('scheduleCount');
const scheduleSheet = document.getElementById('scheduleSheet');
const scheduleClose = document.getElementById('scheduleClose');
const scheduleListEl = document.getElementById('scheduleList');
const blackBtn = document.getElementById('blackBtn');
const restoreBtn = document.getElementById('restoreBtn');
const clearBtn = document.getElementById('clearBtn');

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js?v=2').catch(() => {});
let currentVersion = 'kjv';
let reconnectTimer = null;
let socket = null;

async function api(path, options = {}) {
  try {
    const res = await fetch(path, { cache: 'no-store', ...options });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (e) {
    micStatus.textContent = `Connection error: ${e.message}`;
    throw e;
  }
}

async function loadVersions() {
  try {
    const versions = await api('/api/versions');
    versionSelect.innerHTML = '';
    versions.forEach((v) => {
      const opt = document.createElement('option'); opt.value = v.code; opt.textContent = v.name; versionSelect.appendChild(opt);
    });
    if (versions.length) currentVersion = versions[0].code;
  } catch (_) {}
}
loadVersions();
versionSelect.addEventListener('change', () => { currentVersion = versionSelect.value; });
function cleanText(text) { return String(text || '').replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim(); }

async function runSearch() {
  const q = searchInput.value.trim(); if (!q) return;
  try {
    if (multiVersionToggle.checked) renderMultiVersion(await api(`/api/search-all?q=${encodeURIComponent(q)}`));
    else renderSingleVersion(await api(`/api/search?q=${encodeURIComponent(q)}&version=${encodeURIComponent(currentVersion)}`));
  } catch (_) {}
}
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(); });
searchInput.addEventListener('input', () => { clearTimeout(searchInput._d); searchInput._d = setTimeout(runSearch, 300); });

function renderSingleVersion(payload) {
  resultsEl.innerHTML = '';
  if (payload.error) { resultsMeta.textContent = 'Error'; resultsEl.innerHTML = `<div class="empty-state">${payload.error}</div>`; return; }
  resultsMeta.textContent = payload.type === 'reference' ? `${payload.reference.bookName} ${payload.reference.chapter}` : `${payload.results.length} result(s)`;
  if (!payload.results.length) { resultsEl.innerHTML = '<div class="empty-state">No matches found.</div>'; return; }
  payload.results.forEach((row) => resultsEl.appendChild(buildCard(row, row.version || currentVersion)));
}
function renderMultiVersion(payload) {
  resultsEl.innerHTML = '';
  if (payload.error) { resultsMeta.textContent = 'Error'; resultsEl.innerHTML = `<div class="empty-state">${payload.error}</div>`; return; }
  resultsMeta.textContent = `${payload.reference.bookName} ${payload.reference.chapter} — all versions`;
  payload.versions.forEach((vGroup) => {
    const wrap = document.createElement('div'); wrap.className = 'version-group';
    const label = document.createElement('div'); label.className = 'version-group-label'; label.textContent = vGroup.versionName; wrap.appendChild(label);
    vGroup.verses.forEach((row) => wrap.appendChild(buildCard(row, vGroup.version)));
    resultsEl.appendChild(wrap);
  });
}
function buildCard(row, version) {
  const item = { reference: `${row.book_name} ${row.chapter}:${row.verse}`, text: cleanText(row.text), version };
  const card = document.createElement('div'); card.className = 'verse-card';
  card.innerHTML = `<div class="verse-ref">${item.reference} (${version.toUpperCase()})</div><div class="verse-text"></div><div class="verse-actions"><button data-action="add">+ Schedule</button><button data-action="live" class="btn-golive">Go Live</button></div>`;
  card.querySelector('.verse-text').textContent = item.text;
  card.querySelector('[data-action="add"]').addEventListener('click', async () => { try { await api('/api/schedule', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(item) }); } catch (_) {} });
  card.querySelector('[data-action="live"]').addEventListener('click', async () => { try { await api('/api/go-live', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(item) }); } catch (_) {} });
  return card;
}

scheduleToggle.addEventListener('click', () => scheduleSheet.classList.add('open'));
scheduleClose.addEventListener('click', () => scheduleSheet.classList.remove('open'));
function renderSchedule(schedule) {
  schedule = Array.isArray(schedule) ? schedule : [];
  scheduleCount.textContent = schedule.length;
  scheduleListEl.innerHTML = '';
  if (!schedule.length) { scheduleListEl.innerHTML = '<div class="empty-state">Nothing added yet.</div>'; return; }
  schedule.forEach((item) => {
    const row = document.createElement('div'); row.className = 'schedule-item';
    row.innerHTML = `<div class="schedule-item-ref"></div><div class="schedule-item-row"><button data-action="up">▲</button><button data-action="down">▼</button><button data-action="live" class="btn-golive" style="flex:1">Go Live</button><button data-action="remove">✕</button></div>`;
    row.querySelector('.schedule-item-ref').textContent = `${item.reference} (${String(item.version || '').toUpperCase()})`;
    row.querySelector('[data-action="up"]').addEventListener('click', () => moveItem(item.id, -1));
    row.querySelector('[data-action="down"]').addEventListener('click', () => moveItem(item.id, 1));
    row.querySelector('[data-action="remove"]').addEventListener('click', () => removeItem(item.id));
    row.querySelector('[data-action="live"]').addEventListener('click', () => sendLive(item));
    scheduleListEl.appendChild(row);
  });
}
async function moveItem(id, direction) { try { await api(`/api/schedule/${id}/move`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({direction})}); } catch (_) {} }
async function removeItem(id) { try { await api(`/api/schedule/${id}`, {method:'DELETE'}); } catch (_) {} }
async function sendLive(item) { try { await api('/api/go-live', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)}); } catch (_) {} }

function renderLive(snapshot) {
  const live = snapshot.live;
  const output = snapshot.output || (live ? 'live' : 'clear');
  liveBanner.classList.remove('hidden');
  outputLabel.textContent = output === 'black' ? 'BLACK' : output === 'clear' ? 'CLEAR' : 'LIVE';
  liveBannerText.textContent = live ? `${live.reference} (${String(live.version || '').toUpperCase()})` : 'No presentation on air';
}

async function outputAction(path) { try { await api(path, {method:'POST'}); } catch (_) {} }
blackBtn.addEventListener('click', () => outputAction('/api/black'));
restoreBtn.addEventListener('click', () => outputAction('/api/restore'));
clearBtn.addEventListener('click', () => outputAction('/api/clear'));

function applyState(snapshot) { renderSchedule(snapshot.schedule); renderLive(snapshot); }
async function initialState() { try { applyState(await api('/api/state')); } catch (_) {} }
initialState();

function connect() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
  socket = new WebSocket(`ws://${location.host}`);
  socket.onopen = () => { connDot.classList.add('connected'); if (reconnectTimer) clearTimeout(reconnectTimer); initialState(); };
  socket.onclose = () => { connDot.classList.remove('connected'); reconnectTimer = setTimeout(connect, 1000); };
  socket.onerror = () => { try { socket.close(); } catch (_) {} };
  socket.onmessage = (event) => {
    try { const msg = JSON.parse(event.data); if (msg.type === 'state') applyState(msg.data); } catch (_) {}
  };
}
connect();

let recognition = null;
let listening = false;
function initRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { micStatus.textContent = 'Voice search not supported on this browser.'; micBtn.disabled = true; return; }
  recognition = new SR(); recognition.continuous = false; recognition.interimResults = true; recognition.lang = 'en-US';
  recognition.onstart = () => { listening = true; micBtn.classList.add('listening'); micStatus.textContent = 'Listening…'; };
  recognition.onresult = (event) => { let transcript = ''; for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript; searchInput.value = transcript; if (event.results[event.results.length - 1].isFinal) { micStatus.textContent = `Heard: "${transcript}"`; runSearch(); } };
  recognition.onerror = (e) => { micStatus.textContent = `Voice error: ${e.error}`; };
  recognition.onend = () => { listening = false; micBtn.classList.remove('listening'); };
}
initRecognition();
micBtn.addEventListener('click', () => { if (!recognition) return; if (listening) recognition.stop(); else { searchInput.value = ''; recognition.start(); } });
