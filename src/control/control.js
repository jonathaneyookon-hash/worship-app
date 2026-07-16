const searchInput = document.getElementById('searchInput');
const bookSuggestionsEl = document.getElementById('bookSuggestions');
const micBtn = document.getElementById('micBtn');
const micStatus = document.getElementById('micStatus');
const versionSelect = document.getElementById('versionSelect');
const multiVersionToggle = document.getElementById('multiVersionToggle');
const resultsMeta = document.getElementById('resultsMeta');
const resultsEl = document.getElementById('results');

const previewText = document.getElementById('previewText');
const previewRef = document.getElementById('previewRef');
const goLiveBtn = document.getElementById('goLiveBtn');

const liveText = document.getElementById('liveText');
const liveRef = document.getElementById('liveRef');
const liveDot = document.getElementById('liveDot');

const openLiveBtn = document.getElementById('openLiveBtn');
const blackBtn = document.getElementById('blackBtn');
const clearLiveBtn = document.getElementById('clearLiveBtn');
const collapseBtn = document.getElementById('collapseBtn');
const resourceArea = document.getElementById('resourceArea');
const scheduleListEl = document.getElementById('scheduleList');
const imageThemeBtn = document.getElementById('imageThemeBtn');
const imageThemeName = document.getElementById('imageThemeName');
const ndiBtn = document.getElementById('ndiBtn');
const remoteBtn = document.getElementById('remoteBtn');
const remotePanel = document.getElementById('remotePanel');
const remoteUrlText = document.getElementById('remoteUrlText');
const remoteQrImg = document.getElementById('remoteQrImg');

let currentVersion = 'kjv';
let activeCardEl = null;
let latestPreviewItem = null; // used to know what "Go Live" should push
let booksList = [];
let suggestions = [];
let highlightedIndex = -1;

// ---- Load available versions ----
async function loadVersions() {
  const versions = await window.scriptureAPI.listVersions();
  versionSelect.innerHTML = '';
  if (versions.length === 0) {
    versionSelect.innerHTML = '<option>No database found</option>';
    const dbError = await window.scriptureAPI.getDbError();
    resultsEl.innerHTML = `<div class="empty-state">
      Bible database failed to load.<br><br>
      <strong>Error:</strong> ${dbError || '(no error captured — try running "npm run build-db" then restart)'}<br><br>
      Please screenshot this and send it back.
    </div>`;
    return;
  }
  versions.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v.code;
    opt.textContent = v.name;
    versionSelect.appendChild(opt);
  });
  currentVersion = versions[0].code;
}
loadVersions();

versionSelect.addEventListener('change', () => { currentVersion = versionSelect.value; });

// ---- Cleaning ----
function cleanText(text) {
  return text.replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim();
}

// ---- Rendering results ----
function renderSingleVersionResults(payload) {
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
    resultsEl.innerHTML = '<div class="empty-state">No matches. Try a different reference or phrase.</div>';
    return;
  }
  payload.results.forEach((row) => resultsEl.appendChild(buildVerseCard(row, row.version || currentVersion)));
}

function renderMultiVersionResults(payload) {
  resultsEl.innerHTML = '';
  if (payload.error) {
    resultsMeta.textContent = 'Error';
    resultsEl.innerHTML = `<div class="empty-state">${payload.error}</div>`;
    return;
  }
  const ref = payload.reference;
  resultsMeta.textContent = `${ref.bookName} ${ref.chapter} — all versions`;
  payload.versions.forEach((vGroup) => {
    const wrap = document.createElement('div');
    wrap.className = 'version-group';
    const label = document.createElement('div');
    label.className = 'version-group-label';
    label.textContent = vGroup.versionName;
    wrap.appendChild(label);
    vGroup.verses.forEach((row) => wrap.appendChild(buildVerseCard(row, vGroup.version)));
    resultsEl.appendChild(wrap);
  });
}

function buildVerseCard(row, version) {
  const card = document.createElement('div');
  card.className = 'verse-card';
  const refLine = document.createElement('div');
  refLine.className = 'verse-ref';
  refLine.textContent = `${row.book_name} ${row.chapter}:${row.verse}`;
  const textLine = document.createElement('div');
  textLine.className = 'verse-text';
  textLine.textContent = cleanText(row.text);
  card.appendChild(refLine);
  card.appendChild(textLine);

  const actions = document.createElement('div');
  actions.className = 'verse-card-actions';
  const addBtn = document.createElement('button');
  addBtn.className = 'mini-btn';
  addBtn.textContent = '+ Add to Schedule';
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.scriptureAPI.addToSchedule({ reference: `${row.book_name} ${row.chapter}:${row.verse}`, text: cleanText(row.text), version });
  });
  actions.appendChild(addBtn);
  card.appendChild(actions);

  card.addEventListener('click', () => {
    if (activeCardEl) activeCardEl.classList.remove('active');
    card.classList.add('active');
    activeCardEl = card;
    loadIntoPreview({ reference: refLine.textContent, text: cleanText(row.text), version });
  });

  return card;
}

// ---- Preview / Live workflow (routed through shared state) ----
function loadIntoPreview(item) {
  latestPreviewItem = item;
  window.scriptureAPI.setPreview(item);
}

function renderPreview(item) {
  latestPreviewItem = item;
  if (!item) {
    previewText.textContent = 'Nothing selected';
    previewRef.textContent = '';
    goLiveBtn.disabled = true;
    return;
  }
  previewText.textContent = item.text;
  previewRef.textContent = `${item.reference}  (${item.version.toUpperCase()})`;
  goLiveBtn.disabled = false;
}

function renderLive(item) {
  if (!item) {
    liveText.textContent = '';
    liveRef.textContent = '';
    liveDot.classList.remove('on');
    return;
  }
  liveText.textContent = item.text;
  liveRef.textContent = `${item.reference}  (${item.version.toUpperCase()})`;
  liveDot.classList.add('on');
}

goLiveBtn.addEventListener('click', () => {
  if (!latestPreviewItem) return;
  window.scriptureAPI.goLive(latestPreviewItem);
});

openLiveBtn.addEventListener('click', () => window.scriptureAPI.openLiveWindow());

function goBlankLive() {
  window.scriptureAPI.clearLiveState();
}
blackBtn.addEventListener('click', goBlankLive);
clearLiveBtn.addEventListener('click', goBlankLive);

document.querySelectorAll('.swatch').forEach((sw) => {
  sw.addEventListener('click', () => {
    window.scriptureAPI.setLiveTheme({ type: 'color', background: sw.dataset.bg });
    imageThemeName.textContent = '';
  });
});

imageThemeBtn.addEventListener('click', async () => {
  const result = await window.scriptureAPI.selectBackgroundImage();
  if (!result) return;
  window.scriptureAPI.setLiveTheme({ type: 'image', url: result.url });
  imageThemeName.textContent = result.path.split(/[\\/]/).pop();
});

// ---- Resource Area collapse ----
collapseBtn.addEventListener('click', () => {
  resourceArea.classList.toggle('collapsed');
  collapseBtn.innerHTML = resourceArea.classList.contains('collapsed') ? '&#9660;' : '&#9650;';
});

// ---- Schedule (set list) — rendered from shared state ----
function renderSchedule(schedule) {
  scheduleListEl.innerHTML = '';
  if (!schedule || schedule.length === 0) {
    scheduleListEl.innerHTML = '<div class="schedule-empty">Add verses here to build your service order.</div>';
    return;
  }
  schedule.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'schedule-item';

    const indexEl = document.createElement('div');
    indexEl.className = 'schedule-item-index';
    indexEl.textContent = idx + 1;

    const body = document.createElement('div');
    body.className = 'schedule-item-body';
    const refEl = document.createElement('div');
    refEl.className = 'schedule-item-ref';
    refEl.textContent = `${item.reference} (${item.version.toUpperCase()})`;
    body.appendChild(refEl);

    const controls = document.createElement('div');
    controls.className = 'schedule-item-controls';
    const upBtn = document.createElement('button');
    upBtn.textContent = '▲';
    upBtn.title = 'Move up';
    upBtn.addEventListener('click', (e) => { e.stopPropagation(); window.scriptureAPI.moveSchedule(item.id, -1); });
    const downBtn = document.createElement('button');
    downBtn.textContent = '▼';
    downBtn.title = 'Move down';
    downBtn.addEventListener('click', (e) => { e.stopPropagation(); window.scriptureAPI.moveSchedule(item.id, 1); });
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    removeBtn.title = 'Remove';
    removeBtn.addEventListener('click', (e) => { e.stopPropagation(); window.scriptureAPI.removeFromSchedule(item.id); });
    controls.appendChild(upBtn);
    controls.appendChild(downBtn);
    controls.appendChild(removeBtn);

    row.appendChild(indexEl);
    row.appendChild(body);
    row.appendChild(controls);

    row.addEventListener('click', () => loadIntoPreview(item));

    scheduleListEl.appendChild(row);
  });
}

// ---- Shared state sync: initial load + live updates (from self or Remote) ----
async function initState() {
  const snapshot = await window.scriptureAPI.getState();
  renderPreview(snapshot.preview);
  renderLive(snapshot.live);
  renderSchedule(snapshot.schedule);
}
initState();

window.scriptureAPI.onStateUpdate((snapshot) => {
  renderPreview(snapshot.preview);
  renderLive(snapshot.live);
  renderSchedule(snapshot.schedule);
});

// ---- Remote panel (URL + QR code for the mobile Remote) ----
remoteBtn.addEventListener('click', async () => {
  const isOpen = remotePanel.classList.toggle('open');
  if (!isOpen) return;
  const info = await window.scriptureAPI.getRemoteInfo();
  if (!info) {
    remoteUrlText.textContent = 'Could not detect a network address. Make sure this device is connected to WiFi.';
    return;
  }
  remoteUrlText.textContent = info.url;
  if (info.qrDataUrl) {
    remoteQrImg.src = info.qrDataUrl;
    remoteQrImg.style.display = 'block';
  }
});

// ---- Search ----
async function runSearch(opts = {}) {
  const query = searchInput.value.trim();
  if (!query) return;
  if (multiVersionToggle.checked) {
    renderMultiVersionResults(await window.scriptureAPI.searchAllVersions(query));
    return;
  }
  const payload = await window.scriptureAPI.search(query, currentVersion);
  renderSingleVersionResults(payload);

  // Enter on a single, unambiguous verse reference (e.g. "John 3:16") jumps
  // straight to Live — same fast path EasyWorship uses. Whole-chapter results
  // or phrase-search matches still just populate the list, since there's no
  // single obvious verse to commit to.
  if (opts.autoLive && payload.type === 'reference' && payload.results.length === 1) {
    const row = payload.results[0];
    const item = { reference: `${row.book_name} ${row.chapter}:${row.verse}`, text: cleanText(row.text), version: row.version || currentVersion };
    loadIntoPreview(item);
    window.scriptureAPI.goLive(item);
  }
}
// ---- Book autocomplete (EasyWorship-style: type "i" -> Isaiah suggested,
// space accepts it and moves on to typing chapter/verse) ----
async function loadBooks() {
  booksList = await window.scriptureAPI.listBooks();
}
loadBooks();

function updateSuggestions() {
  const raw = searchInput.value;
  // Only offer book suggestions while no digit has been typed yet — once a
  // chapter number appears, the book portion is considered locked in.
  if (!raw || /\d/.test(raw)) {
    closeSuggestions();
    return;
  }
  const query = raw.trim().toLowerCase();
  if (!query) {
    closeSuggestions();
    return;
  }
  suggestions = booksList
    .filter((name) => {
      const lower = name.toLowerCase();
      return lower.startsWith(query) || lower.split(' ').some((word) => word.startsWith(query));
    })
    .slice(0, 8);

  if (suggestions.length === 0) {
    closeSuggestions();
    return;
  }
  highlightedIndex = 0;
  renderSuggestions();
}

function renderSuggestions() {
  bookSuggestionsEl.innerHTML = '';
  suggestions.forEach((name, idx) => {
    const el = document.createElement('div');
    el.className = 'book-suggestion' + (idx === highlightedIndex ? ' highlighted' : '');
    el.textContent = name;
    el.addEventListener('mousedown', (e) => {
      e.preventDefault(); // keep focus in the input
      selectSuggestion(name);
    });
    bookSuggestionsEl.appendChild(el);
  });
  bookSuggestionsEl.classList.add('open');
}

function closeSuggestions() {
  suggestions = [];
  highlightedIndex = -1;
  bookSuggestionsEl.classList.remove('open');
  bookSuggestionsEl.innerHTML = '';
}

function selectSuggestion(name) {
  searchInput.value = name + ' ';
  closeSuggestions();
  searchInput.focus();
}

searchInput.addEventListener('input', () => {
  updateSuggestions();
  clearTimeout(searchInput._debounce);
  searchInput._debounce = setTimeout(() => runSearch({ autoLive: false }), 350);
});

searchInput.addEventListener('keydown', (e) => {
  if (bookSuggestionsEl.classList.contains('open')) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedIndex = Math.min(highlightedIndex + 1, suggestions.length - 1);
      renderSuggestions();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, 0);
      renderSuggestions();
      return;
    }
    if (e.key === ' ' || e.key === 'Enter') {
      if (highlightedIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[highlightedIndex]);
        return;
      }
    }
    if (e.key === 'Escape') {
      closeSuggestions();
      return;
    }
  }
  if (e.key === 'Enter') runSearch({ autoLive: true });
});

searchInput.addEventListener('blur', () => {
  // small delay so a suggestion click's mousedown still registers first
  setTimeout(closeSuggestions, 150);
});

// ---- Voice search ----
let recognition = null;
let listening = false;

function initRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micStatus.textContent = 'Voice search unavailable.';
    micBtn.disabled = true;
    return;
  }
  recognition = new SpeechRecognition();
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
  recognition.onerror = (event) => { micStatus.textContent = `Voice error: ${event.error}`; };
  recognition.onend = () => { listening = false; micBtn.classList.remove('listening'); };
}
initRecognition();

micBtn.addEventListener('click', () => {
  if (!recognition) return;
  if (listening) recognition.stop();
  else { searchInput.value = ''; recognition.start(); }
});

// ---- NDI ----
async function refreshNdiStatus() {
  const status = await window.scriptureAPI.ndiStatus();
  if (!status.available) {
    ndiBtn.textContent = 'NDI: Not installed';
    ndiBtn.title = 'NDI support is not installed. See README "NDI Output" section.';
    ndiBtn.disabled = true;
  }
}
refreshNdiStatus();

let ndiRunning = false;
ndiBtn.addEventListener('click', async () => {
  if (!ndiRunning) {
    ndiBtn.textContent = 'NDI: Starting…';
    const result = await window.scriptureAPI.ndiStart();
    if (result.ok) {
      ndiRunning = true;
      ndiBtn.textContent = 'NDI: On';
      ndiBtn.classList.add('btn-ndi-on');
    } else {
      ndiBtn.textContent = 'NDI: Off';
      alert(`Couldn't start NDI: ${result.error}`);
    }
  } else {
    await window.scriptureAPI.ndiStop();
    ndiRunning = false;
    ndiBtn.textContent = 'NDI: Off';
    ndiBtn.classList.remove('btn-ndi-on');
  }
});
