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
const scheduleToggle = document.getElementById('scheduleToggle');
const scheduleCount = document.getElementById('scheduleCount');
const scheduleSheet = document.getElementById('scheduleSheet');
const scheduleClose = document.getElementById('scheduleClose');
const scheduleListEl = document.getElementById('scheduleList');

// ---- PWA: register service worker so this can be "installed" as an app ----
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => { /* non-fatal */ });
}

let currentVersion = 'kjv';

// ---- API helpers ----
async function api(path, options) {
  const res = await fetch(path, options);
  return res.json();
}

// ---- Load versions ----
async function loadVersions() {
  const versions = await api('/api/versions');
  versionSelect.innerHTML = '';
  versions.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v.code;
    opt.textContent = v.name;
    versionSelect.appendChild(opt);
  });
  if (versions.length) currentVersion = versions[0].code;
}
loadVersions();
versionSelect.addEventListener('change', () => { currentVersion = versionSelect.value; });

function cleanText(text) {
  return text.replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim();
}

// ---- Search ----
async function runSearch() {
  const q = searchInput.value.trim();
  if (!q) return;
  if (multiVersionToggle.checked) {
    const payload = await api(`/api/search-all?q=${encodeURIComponent(q)}`);
    renderMultiVersion(payload);
  } else {
    const payload = await api(`/api/search?q=${encodeURIComponent(q)}&version=${currentVersion}`);
    renderSingleVersion(payload);
  }
}
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(); });
searchInput.addEventListener('input', () => {
  clearTimeout(searchInput._d);
  searchInput._d = setTimeout(runSearch, 350);
});

function renderSingleVersion(payload) {
  resultsEl.innerHTML = '';
  if (payload.error) {
    resultsMeta.textContent = 'Error';
    resultsEl.innerHTML = `<div class="empty-state">${payload.error}</div>`;
    return;
  }
  resultsMeta.textContent = payload.type === 'reference'
    ? `${payload.reference.bookName} ${payload.reference.chapter}`
    : `${payload.results.length} result(s)`;
  if (payload.results.length === 0) {
    resultsEl.innerHTML = '<div class="empty-state">No matches found.</div>';
    return;
  }
  payload.results.forEach((row) => resultsEl.appendChild(buildCard(row, row.version || currentVersion)));
}

function renderMultiVersion(payload) {
  resultsEl.innerHTML = '';
  if (payload.error) {
    resultsMeta.textContent = 'Error';
    resultsEl.innerHTML = `<div class="empty-state">${payload.error}</div>`;
    return;
  }
  resultsMeta.textContent = `${payload.reference.bookName} ${payload.reference.chapter} — all versions`;
  payload.versions.forEach((vGroup) => {
    const wrap = document.createElement('div');
    wrap.className = 'version-group';
    const label = document.createElement('div');
    label.className = 'version-group-label';
    label.textContent = vGroup.versionName;
    wrap.appendChild(label);
    vGroup.verses.forEach((row) => wrap.appendChild(buildCard(row, vGroup.version)));
    resultsEl.appendChild(wrap);
  });
}

function buildCard(row, version) {
  const item = { reference: `${row.book_name} ${row.chapter}:${row.verse}`, text: cleanText(row.text), version };
  const card = document.createElement('div');
  card.className = 'verse-card';
  card.innerHTML = `
    <div class="verse-ref">${item.reference} (${version.toUpperCase()})</div>
    <div class="verse-text">${item.text}</div>
    <div class="verse-actions">
      <button data-action="add">+ Schedule</button>
      <button data-action="live" class="btn-golive">Go Live</button>
    </div>
  `;
  card.querySelector('[data-action="add"]').addEventListener('click', () => {
    api('/api/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
  });
  card.querySelector('[data-action="live"]').addEventListener('click', () => {
    api('/api/go-live', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
  });
  return card;
}

// ---- Schedule sheet ----
scheduleToggle.addEventListener('click', () => scheduleSheet.classList.add('open'));
scheduleClose.addEventListener('click', () => scheduleSheet.classList.remove('open'));

function renderSchedule(schedule) {
  scheduleCount.textContent = schedule.length;
  scheduleListEl.innerHTML = '';
  if (schedule.length === 0) {
    scheduleListEl.innerHTML = '<div class="empty-state">Nothing added yet.</div>';
    return;
  }
  schedule.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'schedule-item';
    row.innerHTML = `
      <div class="schedule-item-ref">${item.reference} (${item.version.toUpperCase()})</div>
      <div class="schedule-item-row">
        <button data-action="up">▲</button>
        <button data-action="down">▼</button>
        <button data-action="live" class="btn-golive" style="flex:1">Go Live</button>
        <button data-action="remove">✕</button>
      </div>
    `;
    row.querySelector('[data-action="up"]').addEventListener('click', () => moveItem(item.id, -1));
    row.querySelector('[data-action="down"]').addEventListener('click', () => moveItem(item.id, 1));
    row.querySelector('[data-action="remove"]').addEventListener('click', () => removeItem(item.id));
    row.querySelector('[data-action="live"]').addEventListener('click', () => {
      api('/api/go-live', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
    });
    scheduleListEl.appendChild(row);
  });
}

function moveItem(id, direction) {
  api(`/api/schedule/${id}/move`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ direction }) });
}
function removeItem(id) {
  api(`/api/schedule/${id}`, { method: 'DELETE' });
}

// ---- Live banner ----
function renderLive(live) {
  if (!live) {
    liveBanner.classList.add('hidden');
    return;
  }
  liveBanner.classList.remove('hidden');
  liveBannerText.textContent = `${live.reference} (${live.version.toUpperCase()})`;
}

// ---- WebSocket sync ----
function connect() {
  const ws = new WebSocket(`ws://${location.host}`);
  ws.onopen = () => connDot.classList.add('connected');
  ws.onclose = () => { connDot.classList.remove('connected'); setTimeout(connect, 2000); };
  ws.onerror = () => ws.close();
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'state') {
        renderSchedule(msg.data.schedule);
        renderLive(msg.data.live);
      }
    } catch (e) { /* ignore */ }
  };
}
connect();

// ---- Voice search ----
let recognition = null;
let listening = false;
function initRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { micStatus.textContent = 'Voice search not supported on this browser.'; micBtn.disabled = true; return; }
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.onstart = () => { listening = true; micBtn.classList.add('listening'); micStatus.textContent = 'Listening…'; };
  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript;
    searchInput.value = transcript;
    if (event.results[event.results.length - 1].isFinal) {
      micStatus.textContent = `Heard: "${transcript}"`;
      runSearch();
    }
  };
  recognition.onerror = (e) => { micStatus.textContent = `Voice error: ${e.error}`; };
  recognition.onend = () => { listening = false; micBtn.classList.remove('listening'); };
}
initRecognition();
micBtn.addEventListener('click', () => {
  if (!recognition) return;
  if (listening) recognition.stop();
  else { searchInput.value = ''; recognition.start(); }
});
