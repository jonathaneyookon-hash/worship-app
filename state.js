// state.js — single source of truth for schedule + preview + live state.
// Both the Electron control window (via IPC) and the mobile Remote (via
// HTTP/WebSocket) read and write through this same object, so a change made
// from a phone instantly reflects on the desktop and vice versa.

const { EventEmitter } = require('events');

class AppState extends EventEmitter {
  constructor() {
    super();
    this.schedule = []; // [{ id, reference, text, version }]
    this.preview = null;
    this.live = null;
    this._nextId = 1;
  }

  addToSchedule(item) {
    const entry = { id: this._nextId++, ...item };
    this.schedule.push(entry);
    this._emitChange();
    return entry;
  }

  removeFromSchedule(id) {
    this.schedule = this.schedule.filter((i) => i.id !== id);
    this._emitChange();
  }

  moveInSchedule(id, direction) {
    const idx = this.schedule.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= this.schedule.length) return;
    [this.schedule[idx], this.schedule[newIdx]] = [this.schedule[newIdx], this.schedule[idx]];
    this._emitChange();
  }

  setPreview(item) {
    this.preview = item;
    this._emitChange();
  }

  goLive(item) {
    this.live = item || this.preview;
    this.preview = this.live;
    this._emitChange();
    this.emit('live', this.live);
  }

  clearLive() {
    this.live = null;
    this._emitChange();
    this.emit('live', null);
  }

  snapshot() {
    return { schedule: this.schedule, preview: this.preview, live: this.live };
  }

  _emitChange() {
    this.emit('change', this.snapshot());
  }
}

// Singleton — both main.js (IPC) and server/index.js (HTTP/WS) require this
// same instance.
module.exports = new AppState();
