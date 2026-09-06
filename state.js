// Shared presentation state used by the desktop controller and mobile Remote.
const { EventEmitter } = require('events');

class AppState extends EventEmitter {
  constructor() {
    super();
    this.schedule = [];
    this.preview = null;
    this.live = null;
    this.output = 'live'; // live | black | clear
    this._nextId = 1;
  }

  addToSchedule(item) {
    if (!item || !item.reference || !item.text) return null;
    const entry = { id: this._nextId++, ...item };
    this.schedule.push(entry);
    this._emitChange();
    return entry;
  }

  removeFromSchedule(id) {
    this.schedule = this.schedule.filter((i) => i.id !== Number(id));
    this._emitChange();
  }

  moveInSchedule(id, direction) {
    const idx = this.schedule.findIndex((i) => i.id === Number(id));
    if (idx === -1) return;
    const newIdx = idx + Number(direction);
    if (newIdx < 0 || newIdx >= this.schedule.length) return;
    [this.schedule[idx], this.schedule[newIdx]] = [this.schedule[newIdx], this.schedule[idx]];
    this._emitChange();
  }

  setPreview(item) {
    this.preview = item || null;
    this._emitChange();
  }

  goLive(item) {
    const next = item || this.preview;
    if (!next) return;
    this.live = next;
    this.preview = next;
    this.output = 'live';
    this._emitChange();
    this.emit('display', this.snapshot());
  }

  blackout() {
    this.output = 'black';
    this._emitChange();
    this.emit('display', this.snapshot());
  }

  clearLive() {
    this.live = null;
    this.output = 'clear';
    this._emitChange();
    this.emit('display', this.snapshot());
  }

  restoreLive() {
    if (!this.live) return;
    this.output = 'live';
    this._emitChange();
    this.emit('display', this.snapshot());
  }

  snapshot() {
    return {
      schedule: this.schedule,
      preview: this.preview,
      live: this.live,
      output: this.output,
    };
  }

  _emitChange() {
    this.emit('change', this.snapshot());
  }
}

module.exports = new AppState();
