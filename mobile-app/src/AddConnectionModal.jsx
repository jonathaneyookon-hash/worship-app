import React, { useState } from 'react';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

const URL_PATTERN = /^https?:\/\/[^\s]+$/i;

export default function AddConnectionModal({ onAdd, onClose }) {
  const [mode, setMode] = useState('choice'); // 'choice' | 'manual'
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  async function handleScan() {
    setError('');
    setScanning(true);
    try {
      const { available } = await BarcodeScanner.isSupported();
      if (!available) {
        setError("QR scanning isn't supported on this device -- use manual entry instead.");
        setMode('manual');
        return;
      }

      const granted = await BarcodeScanner.requestPermissions();
      if (granted.camera !== 'granted' && granted.camera !== 'limited') {
        setError('Camera permission was denied -- use manual entry instead.');
        setMode('manual');
        return;
      }

      const { barcodes } = await BarcodeScanner.scan();
      const raw = barcodes?.[0]?.rawValue?.trim();
      if (!raw) {
        setError('No QR code detected.');
        return;
      }
      if (!URL_PATTERN.test(raw)) {
        setError("That QR code doesn't look like a Scripture Presenter Remote code -- scan the one from the control room's Remote panel.");
        return;
      }
      onAdd({ name: name.trim() || 'Scripture Presenter', url: raw.replace(/\/+$/, '') });
    } catch (err) {
      // BarcodeScanner.scan() rejects if the user cancels -- that's not a real error
      if (err?.message && !/cancel/i.test(err.message)) {
        setError(`Scan failed: ${err.message}`);
      }
    } finally {
      setScanning(false);
    }
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    const trimmedUrl = url.trim().replace(/\/+$/, '');
    if (!trimmedUrl) {
      setError('Enter the address shown in the control room (e.g. http://192.168.1.50:3939).');
      return;
    }
    if (!URL_PATTERN.test(trimmedUrl)) {
      setError('That address needs to start with http:// or https://');
      return;
    }
    onAdd({ name: name.trim() || 'Scripture Presenter', url: trimmedUrl });
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Add a Connection</h3>
          <button style={styles.closeBtn} onClick={onClose}>&#10005;</button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {mode === 'choice' && (
          <div style={styles.choiceRow}>
            <p style={styles.hint}>
              On the desktop app, open the control room's <b>Remote</b> panel to see the QR code and address.
            </p>
            <button style={styles.primaryBtn} onClick={handleScan} disabled={scanning}>
              {scanning ? 'Scanning…' : '📷 Scan QR code'}
            </button>
            <button style={styles.secondaryBtn} onClick={() => setMode('manual')}>
              Enter address manually
            </button>
          </div>
        )}

        {mode === 'manual' && (
          <form onSubmit={handleManualSubmit} style={styles.form}>
            <label style={styles.label}>
              Name (optional)
              <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Auditorium" />
            </label>
            <label style={styles.label}>
              Address
              <input style={styles.input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://192.168.1.50:3939" autoCapitalize="none" autoCorrect="off" />
            </label>
            <div style={styles.formButtons}>
              <button type="button" style={styles.secondaryBtn} onClick={() => setMode('choice')}>Back</button>
              <button type="submit" style={styles.primaryBtn}>Add</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  modal: { background: '#152238', borderRadius: 12, padding: 20, width: 340, maxWidth: '90vw', color: '#eef2f7' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { margin: 0, fontSize: 16 },
  closeBtn: { background: 'none', border: 'none', color: '#8d99a9', fontSize: 16, cursor: 'pointer' },
  error: { background: '#3a1f1f', color: '#f6a3a3', padding: '8px 10px', borderRadius: 6, fontSize: 12, marginBottom: 12 },
  hint: { fontSize: 12, color: '#8d99a9', lineHeight: 1.5, margin: '0 0 4px' },
  choiceRow: { display: 'flex', flexDirection: 'column', gap: 10 },
  primaryBtn: { padding: '10px 16px', background: '#c8a15b', color: '#1b1408', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' },
  secondaryBtn: { padding: '10px 16px', background: '#1e2c42', color: '#eef2f7', border: '1px solid #3a4658', borderRadius: 6, cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: 10 },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#8d99a9' },
  input: { padding: '8px 10px', background: '#0d1520', border: '1px solid #3a4658', borderRadius: 6, color: '#eef2f7', fontSize: 13 },
  formButtons: { display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 8 },
};
