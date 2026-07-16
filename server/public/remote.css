@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600;700&display=swap');

:root {
  --bg: #10141c;
  --panel: #171d29;
  --panel-2: #1d2432;
  --panel-3: #232b3c;
  --border: #2a3242;
  --gold: #c9a15a;
  --gold-soft: #e8cd94;
  --text: #eef0f3;
  --text-muted: #8b93a7;
  --live-red: #c0604d;
  --green: #6fae7f;
}

* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}

.app { padding: 14px 14px 90px; padding-top: calc(14px + env(safe-area-inset-top)); }

.header-top { display: flex; align-items: center; justify-content: space-between; }
.brand { font-size: 13px; font-weight: 700; letter-spacing: 2px; color: var(--gold-soft); }
.conn-dot { width: 9px; height: 9px; border-radius: 50%; background: #555; }
.conn-dot.connected { background: var(--green); box-shadow: 0 0 6px 1px rgba(111,174,127,0.6); }

.live-banner {
  margin-top: 10px;
  background: rgba(192,96,77,0.15);
  border: 1px solid var(--live-red);
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.live-banner.hidden { display: none; }
.live-banner-label {
  background: var(--live-red);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 2px 6px;
  border-radius: 4px;
}

.search-bar { display: flex; gap: 8px; margin-top: 16px; }
#searchInput {
  flex: 1;
  background: var(--panel-2);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 14px 14px;
  border-radius: 10px;
  font-size: 16px;
  outline: none;
}
#searchInput:focus { border-color: var(--gold); }
.mic-btn {
  width: 50px;
  border: 1px solid var(--border);
  background: var(--panel-2);
  color: var(--text-muted);
  border-radius: 10px;
}
.mic-btn.listening { background: var(--gold); color: #1a1408; border-color: var(--gold); }
.mic-status { font-size: 12px; color: var(--gold-soft); margin-top: 6px; min-height: 16px; }

.version-row { display: flex; align-items: center; gap: 12px; margin-top: 14px; flex-wrap: wrap; }
#versionSelect {
  flex: 1;
  min-width: 140px;
  background: var(--panel-2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
  font-size: 14px;
}
.checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-muted); }

.results-meta { margin-top: 18px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); }
.results { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }

.verse-card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
.verse-ref { font-family: 'Lora', serif; font-weight: 600; color: var(--gold-soft); font-size: 13px; margin-bottom: 5px; }
.verse-text { font-size: 14px; line-height: 1.5; }
.verse-actions { display: flex; gap: 8px; margin-top: 10px; }
.verse-actions button {
  flex: 1;
  padding: 10px 8px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--panel-2);
  color: var(--text);
  font-size: 12.5px;
  font-weight: 600;
}
.btn-golive { background: var(--gold) !important; color: #1a1408 !important; border-color: var(--gold) !important; }

.version-group { margin-top: 14px; }
.version-group-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }

.empty-state { color: var(--text-muted); font-size: 13px; padding: 20px 4px; }

.schedule-toggle {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  padding: 14px;
  padding-bottom: calc(14px + env(safe-area-inset-bottom));
  background: var(--panel);
  border-top: 1px solid var(--border);
  color: var(--gold-soft);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
}

.schedule-sheet {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  max-height: 70vh;
  background: var(--panel);
  border-top: 1px solid var(--border);
  border-radius: 16px 16px 0 0;
  transform: translateY(100%);
  transition: transform .25s ease;
  display: flex;
  flex-direction: column;
  z-index: 10;
}
.schedule-sheet.open { transform: translateY(0); }
.schedule-sheet-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px;
  font-size: 12px; letter-spacing: 1.5px; font-weight: 700; color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}
.sheet-close { background: none; border: none; color: var(--text-muted); font-size: 14px; }
.schedule-list { overflow-y: auto; padding: 12px 16px calc(16px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 8px; }

.schedule-item { background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; }
.schedule-item-ref { font-family: 'Lora', serif; font-size: 13px; color: var(--gold-soft); }
.schedule-item-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.schedule-item-row button {
  padding: 7px 10px; font-size: 12px; border-radius: 6px;
  border: 1px solid var(--border); background: var(--panel-3); color: var(--text);
}
