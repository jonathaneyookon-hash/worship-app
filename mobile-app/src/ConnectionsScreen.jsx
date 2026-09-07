import React, { useEffect, useState, useCallback } from 'react';
import { getSavedConnections, saveConnection, removeConnection } from './storage';
import AddConnectionModal from './AddConnectionModal';

export default function ConnectionsScreen({ onSelect }) {
  const [connections, setConnections] = useState([]);
  const [statuses, setStatuses] = useState({}); // url -> 'online' | 'offline' | 'checking'
  const [showAddModal, setShowAddModal] = useState(false);

  const refresh = useCallback(async () => {
    const list = await getSavedConnections();
    setConnections(list);
    checkStatuses(list);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function checkStatuses(list) {
    for (const conn of list) {
      setStatuses((prev) => ({ ...prev, [conn.url]: 'checking' }));
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`${conn.url}/api/health`, { signal: controller.signal });
        clearTimeout(timeout);
        const data = await res.json();
        setStatuses((prev) => ({ ...prev, [conn.url]: data.ok ? 'online' : 'offline' }));
      } catch {
        setStatuses((prev) => ({ ...prev, [conn.url]: 'offline' }));
      }
    }
  }

  async function handleAdd(conn) {
    await saveConnection(conn);
    setShowAddModal(false);
    refresh();
  }

  async function handleRemove(url, e) {
    e.stopPropagation();
    if (!confirm('Remove this connection?')) return;
    await removeConnection(url);
    refresh();
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Scripture Remote</h2>
        <button style={styles.addBtn} onClick={() => setShowAddModal(true)}>+ Add</button>
      </div>

      {connections.length === 0 && (
        <div style={styles.empty}>
          No saved connections yet.<br />
          Tap "+ Add" and scan the QR code from the desktop app's Remote panel,
          or enter its address manually.
        </div>
      )}

      <ul style={styles.list}>
        {connections.map((conn) => (
          <li key={conn.url} style={styles.item} onClick={() => onSelect(conn)}>
            <div style={styles.itemMain}>
              <span style={{ ...styles.dot, background: dotColor(statuses[conn.url]) }} />
              <div>
                <div style={styles.itemName}>{conn.name}</div>
                <div style={styles.itemUrl}>{conn.url}</div>
              </div>
            </div>
            <button style={styles.removeBtn} onClick={(e) => handleRemove(conn.url, e)}>Remove</button>
          </li>
        ))}
      </ul>

      {showAddModal && (
        <AddConnectionModal onAdd={handleAdd} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

function dotColor(status) {
  if (status === 'online') return '#4ade80';
  if (status === 'checking') return '#8d99a9';
  return '#555';
}

const styles = {
  container: { minHeight: '100vh', background: '#0d1520', color: '#eef2f7', fontFamily: 'system-ui, sans-serif', padding: 16, boxSizing: 'border-box' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { margin: 0, fontSize: 20, color: '#c8a15b' },
  addBtn: { padding: '8px 14px', background: '#c8a15b', color: '#1b1408', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' },
  empty: { color: '#8d99a9', fontSize: 13, textAlign: 'center', marginTop: 60, lineHeight: 1.7 },
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#152238', borderRadius: 8, cursor: 'pointer' },
  itemMain: { display: 'flex', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  itemName: { fontSize: 14, fontWeight: 600 },
  itemUrl: { fontSize: 11, color: '#8d99a9' },
  removeBtn: { background: 'none', border: 'none', color: '#5b6b80', fontSize: 12, cursor: 'pointer' },
};
