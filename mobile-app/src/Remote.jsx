import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ScreenOrientation } from '@capacitor/screen-orientation';

export default function Remote({ connection, onBack }) {
  const { url } = connection;
  const [connState, setConnState] = useState('connecting'); // connecting | connected | disconnected
  const [state, setState] = useState(null);
  const [versions, setVersions] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null); // {type:'reference'|'phrase', ...}
  const [error, setError] = useState('');
  const wsRef = useRef(null);

  // Force landscape the moment this screen mounts (i.e. as soon as the user
  // connects to a service), matching the "full experience" a dedicated
  // controller like this is meant to give -- restore whatever orientation
  // the device normally allows once they back out.
  useEffect(() => {
    ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {});
    return () => { ScreenOrientation.unlock().catch(() => {}); };
  }, []);

  // WebSocket live state sync, with auto-reconnect (same protocol as the
  // web Remote: {type:'state', data:<snapshot>}).
  useEffect(() => {
    let cancelled = false;
    let reconnectDelay = 1000;
    let ws;

    function connect() {
      try {
        ws = new WebSocket(url.replace(/^http/i, 'ws'));
      } catch {
        setConnState('disconnected');
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => { if (!cancelled) { reconnectDelay = 1000; setConnState('connected'); } };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'state') setState(msg.data);
        } catch { /* ignore malformed frames */ }
      };
      ws.onclose = () => {
        if (cancelled) return;
        setConnState('disconnected');
        setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 15000);
      };
      ws.onerror = () => ws.close();
    }

    connect();
    return () => { cancelled = true; ws?.close(); };
  }, [url]);

  useEffect(() => {
    fetch(`${url}/api/versions`).then((r) => r.json()).then(setVersions).catch(() => {});
    fetch(`${url}/api/state`).then((r) => r.json()).then(setState).catch(() => {});
  }, [url]);

  const api = useCallback((path, opts) => fetch(`${url}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  }).then(async (r) => {
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${r.status})`);
    }
    return r.json();
  }), [url]);

  async function runSearch(all) {
    if (!query.trim()) return;
    setError('');
    try {
      if (all) {
        const data = await api(`/api/search-all?q=${encodeURIComponent(query)}`);
        setResults({ type: 'reference-all', ...data });
      } else {
        const data = await api(`/api/search?q=${encodeURIComponent(query)}&version=${state?.selectedVersion || ''}`);
        setResults(data);
      }
    } catch (e) { setError(e.message); }
  }

  async function addAndGoLive(item) {
    try { await api('/api/go-live', { method: 'POST', body: JSON.stringify(item) }); }
    catch (e) { setError(e.message); }
  }

  async function addToSchedule(item) {
    try { await api('/api/schedule', { method: 'POST', body: JSON.stringify(item) }); }
    catch (e) { setError(e.message); }
  }

  async function goLiveFromSchedule(item) {
    try { await api('/api/go-live', { method: 'POST', body: JSON.stringify(item) }); }
    catch (e) { setError(e.message); }
  }

  async function removeItem(id) {
    try { await api(`/api/schedule/${id}`, { method: 'DELETE' }); }
    catch (e) { setError(e.message); }
  }

  async function moveItem(id, direction) {
    try { await api(`/api/schedule/${id}/move`, { method: 'POST', body: JSON.stringify({ direction }) }); }
    catch (e) { setError(e.message); }
  }

  function step(dir) {
    const a = state?.schedule || [];
    if (!a.length) return;
    let i = a.findIndex((x) => x.id === state.live?.id);
    i = i < 0 ? (dir > 0 ? 0 : a.length - 1) : Math.max(0, Math.min(a.length - 1, i + dir));
    goLiveFromSchedule(a[i]);
  }

  async function black() { try { await api('/api/black', { method: 'POST' }); } catch (e) { setError(e.message); } }
  async function restore() { try { await api('/api/restore', { method: 'POST' }); } catch (e) { setError(e.message); } }
  async function clear() { try { await api('/api/clear', { method: 'POST' }); } catch (e) { setError(e.message); } }
  async function setVersion(v) { try { await api('/api/version', { method: 'POST', body: JSON.stringify({ version: v }) }); } catch (e) { setError(e.message); } }
  async function setTransition(t) { try { await api('/api/transition', { method: 'POST', body: JSON.stringify({ transition: t }) }); } catch (e) { setError(e.message); } }
  async function setStageMode(m) { try { await api('/api/stage-mode', { method: 'POST', body: JSON.stringify({ mode: m }) }); } catch (e) { setError(e.message); } }
  async function setThemeColor(background) { try { await api('/api/theme', { method: 'POST', body: JSON.stringify({ type: 'color', background }) }); } catch (e) { setError(e.message); } }

  async function addSong() {
    const title = prompt('Song title');
    if (!title) return;
    const text = prompt('Lyrics / slide text');
    if (!text) return;
    addToSchedule({ type: 'song', title, text });
  }

  async function addSlide() {
    const title = prompt('Presentation title');
    if (!title) return;
    const text = prompt('Slide text');
    if (!text) return;
    addToSchedule({ type: 'presentation', title, text });
  }

  const schedule = state?.schedule || [];
  const isLive = (item) => state?.live && item.id === state.live.id;

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={onBack}>&larr;</button>
        <div style={styles.connName}>{connection.name}</div>
        <div style={{ ...styles.connDot, background: connState === 'connected' ? '#4ade80' : '#e05252' }} />
        <div style={{ ...styles.outputBadge, ...outputBadgeStyle(state?.output) }}>
          {(state?.output || '...').toUpperCase()}
        </div>
      </div>

      {error && <div style={styles.errorBar} onClick={() => setError('')}>{error} (tap to dismiss)</div>}

      <div style={styles.columns}>
        {/* Search column */}
        <div style={styles.col}>
          <div style={styles.searchRow}>
            <input
              style={styles.searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch(false)}
              placeholder="Search scripture or phrase…"
            />
            <select style={styles.versionSelect} value={state?.selectedVersion || ''} onChange={(e) => setVersion(e.target.value)}>
              {versions.map((v) => <option key={v.code} value={v.code}>{v.code.toUpperCase()}</option>)}
            </select>
          </div>
          <div style={styles.searchButtons}>
            <button style={styles.smallBtn} onClick={() => runSearch(false)}>Search</button>
            <button style={styles.smallBtn} onClick={() => runSearch(true)}>All versions</button>
          </div>
          <div style={styles.resultsList}>
            {renderResults(results, addAndGoLive, addToSchedule)}
          </div>
        </div>

        {/* Control column */}
        <div style={styles.col}>
          <div style={styles.outputRow}>
            <button style={{ ...styles.outputBtn, background: '#000' }} onClick={black}>Black</button>
            <button style={{ ...styles.outputBtn, background: '#2c4a2c' }} onClick={restore}>Restore</button>
            <button style={{ ...styles.outputBtn, background: '#4a2c2c' }} onClick={clear}>Clear</button>
          </div>
          <div style={styles.prevNextRow}>
            <button style={styles.navBtn} onClick={() => step(-1)}>&larr; Prev</button>
            <button style={styles.navBtn} onClick={() => step(1)}>Next &rarr;</button>
          </div>
          <div style={styles.selectRow}>
            <select style={styles.select} defaultValue={state?.transition || 'fade'} onChange={(e) => setTransition(e.target.value)}>
              <option value="fade">Fade</option>
              <option value="cut">Cut</option>
              <option value="slide">Slide</option>
            </select>
            <select style={styles.select} defaultValue={state?.stageMode || 'follow'} onChange={(e) => setStageMode(e.target.value)}>
              <option value="follow">Stage: Follow</option>
              <option value="clock">Stage: Clock</option>
              <option value="notes">Stage: Notes</option>
            </select>
          </div>
          <div style={styles.quickAddRow}>
            <button style={styles.smallBtn} onClick={addSong}>+ Song</button>
            <button style={styles.smallBtn} onClick={addSlide}>+ Slide</button>
          </div>
          <div style={styles.themeRow}>
            <button style={{ ...styles.themeSwatch, background: '#000000' }} onClick={() => setThemeColor('#000000')}>Black</button>
            <button style={{ ...styles.themeSwatch, background: '#071326' }} onClick={() => setThemeColor('#071326')}>Blue</button>
            <button style={{ ...styles.themeSwatch, background: '#21170b' }} onClick={() => setThemeColor('#21170b')}>Warm</button>
          </div>
        </div>

        {/* Schedule column */}
        <div style={styles.col}>
          <div style={styles.colTitle}>Service Order</div>
          <div style={styles.scheduleList}>
            {schedule.length === 0 && <div style={styles.emptyHint}>Nothing in the schedule yet.</div>}
            {schedule.map((item, i) => (
              <div key={item.id} style={{ ...styles.scheduleItem, ...(isLive(item) ? styles.scheduleItemLive : {}) }}>
                <div style={styles.scheduleItemMain} onClick={() => goLiveFromSchedule(item)}>
                  <div style={styles.scheduleItemTitle}>{item.title || item.reference || item.type}</div>
                  <div style={styles.scheduleItemType}>{item.type}</div>
                </div>
                <div style={styles.scheduleItemActions}>
                  <button style={styles.tinyBtn} onClick={() => moveItem(item.id, -1)} disabled={i === 0}>&uarr;</button>
                  <button style={styles.tinyBtn} onClick={() => moveItem(item.id, 1)} disabled={i === schedule.length - 1}>&darr;</button>
                  <button style={styles.tinyBtn} onClick={() => removeItem(item.id)}>&#10005;</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderResults(results, addAndGoLive, addToSchedule) {
  if (!results) return <div style={styles.emptyHint}>Results will appear here.</div>;
  if (results.error) return <div style={styles.emptyHint}>{results.error}</div>;

  if (results.type === 'reference-all') {
    return (results.versions || []).map((v) => (
      <div key={v.code} style={styles.resultCard}>
        <div style={styles.resultMeta}>{v.name || v.code.toUpperCase()}</div>
        <div style={styles.resultText}>{(v.results || v.rows || []).map((r) => r.text).join(' ')}</div>
        <div style={styles.resultActions}>
          <button style={styles.tinyBtn} onClick={() => addToSchedule({ type: 'scripture', reference: results.reference?.raw || '', version: v.code })}>+ Schedule</button>
          <button style={styles.tinyBtn} onClick={() => addAndGoLive({ type: 'scripture', reference: results.reference?.raw || '', version: v.code })}>Go Live</button>
        </div>
      </div>
    ));
  }

  const rows = results.results || [];
  if (!rows.length) return <div style={styles.emptyHint}>No results.</div>;
  return rows.map((r, i) => (
    <div key={i} style={styles.resultCard}>
      <div style={styles.resultMeta}>{r.book_name} {r.chapter}:{r.verse}</div>
      <div style={styles.resultText}>{r.text}</div>
      <div style={styles.resultActions}>
        <button style={styles.tinyBtn} onClick={() => addToSchedule({ type: 'scripture', reference: `${r.book_name} ${r.chapter}:${r.verse}` })}>+ Schedule</button>
        <button style={styles.tinyBtn} onClick={() => addAndGoLive({ type: 'scripture', reference: `${r.book_name} ${r.chapter}:${r.verse}` })}>Go Live</button>
      </div>
    </div>
  ));
}

function outputBadgeStyle(output) {
  if (output === 'live') return { background: '#2c4a2c', color: '#9be89b' };
  if (output === 'black') return { background: '#222', color: '#ccc' };
  if (output === 'clear') return { background: '#4a2c2c', color: '#e89b9b' };
  return { background: '#333', color: '#aaa' };
}

const styles = {
  page: { minHeight: '100vh', background: '#0d1520', color: '#eef2f7', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  topBar: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#152238', borderBottom: '1px solid #24344c' },
  backBtn: { background: 'none', border: 'none', color: '#eef2f7', fontSize: 20, cursor: 'pointer' },
  connName: { flex: 1, fontSize: 14, fontWeight: 600 },
  connDot: { width: 8, height: 8, borderRadius: '50%' },
  outputBadge: { padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 },
  errorBar: { background: '#3a1f1f', color: '#f6a3a3', padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  columns: { flex: 1, display: 'flex', gap: 8, padding: 8, overflow: 'hidden' },
  col: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#101c2e', borderRadius: 8, padding: 8, gap: 8 },
  colTitle: { fontSize: 12, fontWeight: 700, color: '#c8a15b', textTransform: 'uppercase', letterSpacing: 0.5 },
  searchRow: { display: 'flex', gap: 6 },
  searchInput: { flex: 1, padding: '8px 10px', background: '#0d1520', border: '1px solid #3a4658', borderRadius: 6, color: '#eef2f7', fontSize: 13 },
  versionSelect: { background: '#0d1520', border: '1px solid #3a4658', borderRadius: 6, color: '#eef2f7', fontSize: 12 },
  searchButtons: { display: 'flex', gap: 6 },
  resultsList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 },
  resultCard: { background: '#152238', borderRadius: 6, padding: 8 },
  resultMeta: { fontSize: 11, color: '#c8a15b', fontWeight: 700, marginBottom: 4 },
  resultText: { fontSize: 12, lineHeight: 1.4, marginBottom: 6 },
  resultActions: { display: 'flex', gap: 6 },
  outputRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 },
  outputBtn: { padding: '10px 0', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' },
  prevNextRow: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 },
  navBtn: { padding: '10px 0', background: '#1e2c42', color: '#eef2f7', border: '1px solid #3a4658', borderRadius: 6, fontWeight: 600, cursor: 'pointer' },
  selectRow: { display: 'flex', gap: 6 },
  select: { flex: 1, padding: '6px 4px', background: '#0d1520', border: '1px solid #3a4658', borderRadius: 6, color: '#eef2f7', fontSize: 12 },
  quickAddRow: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 },
  themeRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 },
  themeSwatch: { padding: '8px 0', color: '#eef2f7', border: '1px solid #3a4658', borderRadius: 6, fontSize: 11, cursor: 'pointer' },
  scheduleList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 },
  scheduleItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#152238', borderRadius: 6, padding: '6px 8px' },
  scheduleItemLive: { outline: '2px solid #4ade80' },
  scheduleItemMain: { flex: 1, cursor: 'pointer', minWidth: 0 },
  scheduleItemTitle: { fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  scheduleItemType: { fontSize: 10, color: '#8d99a9', textTransform: 'uppercase' },
  scheduleItemActions: { display: 'flex', gap: 4 },
  smallBtn: { flex: 1, padding: '8px 0', background: '#1e2c42', color: '#eef2f7', border: '1px solid #3a4658', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  tinyBtn: { padding: '4px 8px', background: '#1e2c42', color: '#eef2f7', border: '1px solid #3a4658', borderRadius: 4, fontSize: 11, cursor: 'pointer' },
  emptyHint: { color: '#5b6b80', fontSize: 12, textAlign: 'center', marginTop: 20 },
};
