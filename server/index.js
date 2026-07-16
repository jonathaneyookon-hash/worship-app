// server/index.js — local network server for the mobile Remote.
// Runs inside the Electron main process. Serves the Remote's web UI and a
// small REST + WebSocket API backed by the same db/search.js engine and
// shared state.js used by the desktop control window, so both stay in sync.

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');

function startServer({ state, search, port = 3939 }) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/state', (req, res) => res.json(state.snapshot()));

  app.get('/api/versions', (req, res) => {
    res.json(search.listVersions());
  });

  app.get('/api/search', (req, res) => {
    const { q, version } = req.query;
    if (!q || !version) return res.status(400).json({ error: 'q and version are required' });
    try {
      res.json(search.search(q, version));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/search-all', (req, res) => {
    const { q } = req.query;
    const ref = search.parseReference(q || '');
    if (!ref) return res.status(400).json({ error: 'Could not parse a reference from that input.' });
    res.json({ reference: ref, versions: search.getByReferenceAllVersions(ref) });
  });

  app.post('/api/schedule', (req, res) => res.json(state.addToSchedule(req.body)));

  app.delete('/api/schedule/:id', (req, res) => {
    state.removeFromSchedule(Number(req.params.id));
    res.json({ ok: true });
  });

  app.post('/api/schedule/:id/move', (req, res) => {
    state.moveInSchedule(Number(req.params.id), req.body.direction);
    res.json({ ok: true });
  });

  app.post('/api/preview', (req, res) => {
    state.setPreview(req.body);
    res.json({ ok: true });
  });

  app.post('/api/go-live', (req, res) => {
    state.goLive(req.body);
    res.json({ ok: true });
  });

  app.post('/api/clear', (req, res) => {
    state.clearLive();
    res.json({ ok: true });
  });

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  function broadcastState() {
    const payload = JSON.stringify({ type: 'state', data: state.snapshot() });
    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(payload);
    });
  }
  state.on('change', broadcastState);

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'state', data: state.snapshot() }));
  });

  return new Promise((resolve, reject) => {
    httpServer.listen(port, '0.0.0.0', () => resolve({ httpServer, port }));
    httpServer.on('error', reject);
  });
}

module.exports = { startServer };
